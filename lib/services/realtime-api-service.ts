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
      const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${this.openAiKey}`,
          'Content-Type': 'application/sdp'
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to OpenAI: ${response.statusText}`);
      }

      this.emit('debug', 'Received OpenAI answer, establishing connection...');
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: await response.text()
      });

      this.isRecording = true;
      this.emit('recordingStarted');
      this.emit('debug', 'Recording session started successfully');

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

    this.dataChannel.onopen = () => this._sendSessionUpdate();
    this.dataChannel.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Check for function call events (either creation or argument completion)
        if (data.type === 'conversation.item.created' && data.item?.type === 'function_call' ||
            data.type === 'response.function_call_arguments.done') {
          const name = data.item?.name || data.name;
          // Arguments might be fully formed in 'item.parameters' or streamed and finalized in 'arguments'
          const params = data.type === 'response.function_call_arguments.done' ? 
            JSON.parse(data.arguments) : data.item?.parameters;
          const call_id = data.item?.call_id || data.call_id; // Get the call ID
          
          // Process the identified function call
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

    this.dataChannel.onerror = (error) => {
      // Emit errors specifically related to the data channel operation
      this.emit('error', new Error('Data channel error: ' + error.error.message));
    };
  }

  /**
   * Sends the initial session configuration to OpenAI via the data channel.
   * This includes the system instructions and the available tools (functions).
   */
  private _sendSessionUpdate() {
    this._sendEvent({
      type: 'session.update',
      session: {
        instructions: 'You are a helpful voice assistant. Please respond to the user.',
        tools: [{
          type: 'function',
          name: 'generic_tool',
          description: 'A generic tool for demonstration. Replace with your own.',
          parameters: {
            type: 'object',
            properties: {
              input: {
                type: 'string',
                description: 'Input string for the tool.'
              }
            },
            required: ['input']
          }
        }]
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
  private _sendFunctionOutput(call_id: string | undefined, output: any) {
    this._sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id, // Link this output to the specific function call
        output: JSON.stringify(output) // Stringify the output data
      }
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
  private _handleFunctionCall(name: string, params: any, call_id: string) {
    let success = true; // Assume success unless validation fails
    let output: any = null;
    switch(name) {
      case 'generic_tool':
        // TODO: Replace with your own function logic
        output = { result: `You sent: ${params?.input}` };
        break;
      default:
        // Unknown tool
        success = false;
        output = { error: 'Unknown tool' };
        break;
    }
    // Send the result (success/failure) back to OpenAI
    this._sendFunctionOutput(call_id, { success, ...output });
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