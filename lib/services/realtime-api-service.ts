/**
 * VoiceService: Manages real-time voice communication with OpenAI's GPT-4 model using WebRTC
 * 
 * Key features:
 * - Establishes WebRTC connection with OpenAI's real-time API
 * - Handles bi-directional audio streaming
 * - Manages microphone input and audio output
 * - Processes assistant responses through a data channel
 * 
 * Events emitted:
 * - 'debug': Debug information about connection status
 * - 'error': Error events with detailed messages
 * - 'recordingStarted': When voice recording begins
 * - 'recordingStopped': When voice recording ends
 */
import { EventEmitter } from 'events';
import solarParams from '../../info/solar-params.json';

/**
 * Interface for the structure of events sent/received via the data channel.
 */
interface VoiceServiceEvent {
  type: string; // Type identifier for the event (e.g., 'session.update', 'conversation.item.create')
  session?: { // Optional session details, typically sent during initialization or updates
    instructions: string; // System prompt/instructions for the AI assistant
    tools: Array<{ // List of tools (functions) the assistant can use
      type: string; // Tool type, usually 'function'
      name: string; // Name of the function
      description: string; // Description of what the function does
      parameters: { // Definition of the function's parameters
        type: string; // Parameter structure type, usually 'object'
        properties: Record<string, unknown>; // Key-value pairs defining parameters and their types/descriptions
        required: string[]; // List of required parameter names
      };
    }>;
    modalities?: string[]; // Optional modalities to request text and audio
  };
  response?: { // Optional response field for response.create events
    modalities: string[];
  };
  item?: { // Optional item details, related to specific conversation events like function calls/outputs
    type: string; // Type of item (e.g., 'function_call', 'function_call_output')
    call_id?: string; // Unique identifier for a function call, used to link outputs to calls
    parameters?: string | Record<string, unknown>; // Parameters for a function call (can be stringified JSON or object)
    output?: string; // Output of a function call (usually stringified JSON)
    name?: string; // Name of the function being called or responding
  };
}

/**
 * Manages real-time voice communication with OpenAI's GPT-4 model using WebRTC.
 * Handles microphone input, audio output, and bi-directional data channel communication.
 */
export class VoiceService extends EventEmitter {
  // WebRTC peer connection instance
  private peerConnection: RTCPeerConnection | null = null;
  // WebRTC data channel for sending/receiving non-audio data (events, function calls)
  private dataChannel: RTCDataChannel | null = null;
  // HTML audio element to play back the assistant's voice
  private audioElement: HTMLAudioElement | null = null;
  // Media stream capturing the user's microphone input
  private mediaStream: MediaStream | null = null;
  // Flag indicating if the service is currently recording and connected
  private isRecording = false;
  // Timeout ID for enforcing max recording duration (in ms)
  private hardStopTimeout: number | null = null;

  /**
   * Creates an instance of VoiceService.
   * @param openAiKey - The API key for OpenAI authentication.
   */
  constructor(private openAiKey: string) {
    super();
  }

  /**
   * Initiates voice recording and establishes WebRTC connection with OpenAI
   * 
   * Flow:
   * 1. Sets up WebRTC peer connection and audio elements
   * 2. Requests microphone access with specific audio constraints
   * 3. Establishes data channel for message exchange
   * 4. Creates and sends WebRTC offer to OpenAI
   * 5. Processes OpenAI's answer and finalizes connection
   * 
   * @throws Error if connection fails or microphone access is denied
   */
  async startRecording() {
    if (this.isRecording) return;

    // Log when startRecording is invoked
    console.log('[VoiceService] startRecording called');
    this.emit('debug', 'startRecording called');

    try {
      this.emit('debug', 'Initializing WebRTC connection...');
      
      // Initialize WebRTC and audio
      this.peerConnection = new RTCPeerConnection();

      // Add connection state change monitoring
      this.peerConnection.onconnectionstatechange = () => {
        this.emit('debug', `WebRTC connection state: ${this.peerConnection?.connectionState}`);
      };

      // Add ICE connection state monitoring
      this.peerConnection.oniceconnectionstatechange = () => {
        this.emit('debug', `ICE connection state: ${this.peerConnection?.iceConnectionState}`);
      };

      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      document.body.appendChild(this.audioElement);
      
      // Set up audio track handler for incoming assistant voice
      this.peerConnection.ontrack = (event) => {
        if (!this.audioElement) return;
        this.emit('debug', 'Received audio track from OpenAI');
        this.audioElement.srcObject = event.streams[0];
      };

      // Configure and request microphone access with optimal settings for voice recognition
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,          // Mono audio for better voice processing
          sampleRate: 24000,        // Standard sample rate for voice
          echoCancellation: true,   // Reduce echo for clearer audio
          noiseSuppression: true,   // Remove background noise
          autoGainControl: true,    // Normalize audio levels
        }
      });
      
      // Add user's audio track to the peer connection
      this.mediaStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.mediaStream!);
      });

      // Create data channel for exchanging text messages and events
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelHandlers();

      this.emit('debug', 'Creating WebRTC offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.emit('debug', 'Sending offer to OpenAI...');
      // Proxy the SDP offer through our Next.js API route to avoid CORS and hide API key
      const response = await fetch(
        `/api/open-ai-realtime?model=${encodeURIComponent('gpt-4o-mini-realtime-preview-2024-12-17')}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Content-Type': 'application/sdp'
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to connect to OpenAI: ${response.statusText}`);
      }

      this.emit('debug', 'Received OpenAI answer, establishing connection...');
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: await response.text()
      });
      // Request assistant response now that connection is established (stream text and audio)
      this._sendEvent({ type: 'response.create', response: { modalities: ['text', 'audio'] } });

      this.isRecording = true;
      this.emit('recordingStarted');
      console.log('[VoiceService] Emitted recordingStarted event');
      this.emit('debug', 'Recording session started successfully');
      // Warn user 5 seconds after recording starts
      window.setTimeout(() => {
        this.emit('hardStopWarning', 'AI speaking is limited to 60 seconds for public demo purposes.');
      }, 30000);
      // Schedule hard stop after 1 minute
      this.hardStopTimeout = window.setTimeout(() => {
        this.emit('debug', 'Recording time limit of 1 minute reached, stopping recording');
        this.stopRecording();
      }, 60000); // 1 minute

    } catch (err) {
      this.emit('error', new Error('Failed to start recording: ' + (err as Error).message));
      this.stopRecording();
    }
  }

  /**
   * Sets up handlers for the WebRTC data channel.
   * This channel is used for sending session configurations and receiving
   * events like function calls or assistant status updates from OpenAI.
   * 
   * Handles:
   * - Channel opening: Sends initial session configuration
   * - Incoming messages: Processes assistant responses and errors
   * - Error events: Reports channel-related errors
   */
  private setupDataChannelHandlers() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.emit('debug', 'DataChannel opened');
      this._sendSessionUpdate();
    };
    this.dataChannel.onclose = () => {
      this.emit('debug', 'DataChannel closed');
    };
    this.dataChannel.onmessage = async (event) => {
      // Debug log message types
      try {
        const raw = event.data;
        let parsed;
        try { parsed = JSON.parse(raw); }
        catch { parsed = raw; }
        this.emit('debug', `DataChannel message: ${parsed.type || '[non-JSON message]'}`);
      } catch {};
      try {
        const data = JSON.parse(event.data);
        
        // assistant text streaming events
        switch (data.type) {
          case 'response.text.delta':
            this.emit('assistantTextDelta', data.delta as string);
            break;
          case 'response.text.done':
            this.emit('assistantTextDone', data.text as string);
            break;
          case 'response.audio_transcript.delta':
            this.emit('assistantTranscriptDelta', data.delta as string);
            break;
          case 'response.audio_transcript.done':
            this.emit('assistantTranscriptDone', data.text as string);
            break;
        }
        
        // Check for function call events (either creation or argument completion)
        if (data.type === 'conversation.item.created' && data.item?.type === 'function_call' ||
            data.type === 'response.function_call_arguments.done') {
          const name = data.item?.name || data.name;
          const call_id = data.item?.call_id || data.call_id;
          // Minimal parameter parsing: use object or parse JSON string
          const params = data.item?.parameters ?? (data.arguments ? JSON.parse(data.arguments) : {});
          this._handleFunctionCall(name, params, call_id);
        }

        // Check for explicit failure responses from the assistant
        if (data.type === 'response.done' && data.response?.status === 'failed') {
          this.emit('error', new Error(data.response.status_details?.error?.message || 'Response failed'));
        }
      } catch (error) {
        // Emit errors related to message parsing or handling
        this.emit('error', error);
      }
    };

    this.dataChannel.onerror = () => {
      // Emit errors specifically related to the data channel operation
      this.emit('error', new Error('Data channel error'));
    };
  }

  /**
   * Sends the initial session configuration to OpenAI via the data channel.
   * This includes the system instructions and the available tools (functions).
   */
  private _sendSessionUpdate() {
    // Build an enum of valid names for the focus_planet function
    const validNames = [solarParams.sun.name, ...solarParams.planets.map(p => p.name)];
    this._sendEvent({
      type: 'session.update',
      session: {
        instructions: `You are a cosmologist-educator in the style of David Attenborough. Treat every space object as an animal. Always respond in English, regardless of the user's language. If a user asks about, mentions, or wants to hear a story, fact, or information about any planet or the sun, you MUST call the focus_planet tool BEFORE answering, even if the user just wants to know about it, hear a story, or asks indirectly. Never answer about a planet or the sun without first calling the tool.`,
        tools: [{
          type: 'function',
          name: 'focus_planet',
          description: `Call this tool to focus the camera on a planet or the sun whenever the user asks about, mentions, or wants to hear a story, fact, or information about it. Always use this tool before answering any question or request related to a planet or the sun, even if the request is indirect or for a story.`,
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the planet or the sun to focus on',
                enum: validNames
              }
            },
            required: ['name']
          }
        }],
        modalities: ['text', 'audio'], // Enable both text and audio modalities
      }
    });
  }

  /**
   * Sends a structured event object to OpenAI via the data channel if it's open.
   * @param event - The VoiceServiceEvent object to send.
   */
  private _sendEvent(event: VoiceServiceEvent) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(event));
    }
  }

  /**
   * Sends the output of a locally executed function back to OpenAI.
   * This informs the assistant about the result of the function call it requested.
   * @param call_id - The unique identifier of the function call this output corresponds to.
   * @param output - The result data from the function execution.
   */
  private _sendFunctionOutput(call_id: string | undefined, output: Record<string, string>) {
    // 1) Send output item
    this._sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify(output)
      }
    });
    // 2) Immediately trigger model to continue speaking based on the tool result
    this._sendEvent({
      type: 'response.create',
      response: { modalities: ['text', 'audio'] } // Request streaming text and audio
    });
  }

  /**
   * Handles incoming function call requests from the assistant.
   * Determines which local function to execute based on the name,
   * extracts parameters, executes the corresponding logic (often by emitting an event),
   * and sends the success status back to OpenAI.
   * @param name - The name of the function requested by the assistant.
   * @param params - The parameters provided for the function call.
   * @param call_id - The unique identifier for this function call instance.
   */
  private _handleFunctionCall(name: string, params: Record<string, unknown> | string, call_id: string) {
    // Gracefully handle various parameter representations
    let parsedParams: Record<string, unknown> = {};
    try {
      if (typeof params === 'string') {
        parsedParams = params.trim() ? JSON.parse(params) : {};
      } else if (typeof params === 'object' && params !== null) {
        parsedParams = params as Record<string, unknown>;
      }
    } catch (e) {
      // If parsing fails, emit an error but continue with an empty param object
      this.emit('error', new Error(`Failed to parse function parameters: ${(e as Error).message}`));
      parsedParams = {};
    }

    let output: Record<string, string> | null = null;
    switch (name) {
      case 'focus_planet':
        const planetName = parsedParams.name;
        if (typeof planetName === 'string' && planetName.length > 0) {
          console.log('[VoiceService] focus_planet called with:', planetName);
          this.emit('debug', `focus_planet called with: ${planetName}`);
          // Emit event for focusing on a planet or sun
          this.emit('focus_planet', planetName);
          output = { result: `Focusing on ${planetName}` };
        } else {
          output = { error: 'Invalid or missing planet name' };
        }
        break;
      default:
        output = { error: 'Unknown tool' };
        break;
    }
    // Send the function output back to OpenAI
    this._sendFunctionOutput(call_id, output);
  }

  /**
   * Stops the recording session and cleans up all resources
   * 
   * Cleanup steps:
   * 1. Closes data channel connection
   * 2. Stops all media tracks
   * 3. Closes peer connection
   * 4. Removes audio element from DOM
   * 5. Resets all internal state
   */
  async stopRecording() {
    console.log('[VoiceService] stopRecording FUNCTION CALLED. Current isRecording:', this.isRecording);
    if (!this.isRecording) {
      console.log('[VoiceService] stopRecording: Already stopped, returning.');
      return;
    }

    try {
      this.emit('debug', 'Attempting to stop recording and clean up resources...');

      // Clean up WebRTC resources
      this.dataChannel?.close();
      this.mediaStream?.getTracks().forEach(track => track.stop());
      this.peerConnection?.close();
      
      // Clean up audio element from DOM
      if (this.audioElement) {
        this.audioElement.srcObject = null;
        if (document.body.contains(this.audioElement)) {
          document.body.removeChild(this.audioElement);
        }
      }
    } catch (err) {
        this.emit('error', new Error('Error during resource cleanup: ' + (err as Error).message));
    } finally {
        // Clear any pending hard stop timeout
        if (this.hardStopTimeout !== null) {
          clearTimeout(this.hardStopTimeout);
          this.hardStopTimeout = null;
        }
        // Reset all state
        this.dataChannel = null;
        this.mediaStream = null;
        this.peerConnection = null;
        this.audioElement = null;
        this.isRecording = false;
        
        this.emit('recordingStopped');
        this.emit('debug', 'Recording session stopped and state reset.');
        console.log('[VoiceService] Emitted recordingStopped.');
    }
  }
} 