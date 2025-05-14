import type { Scene, Camera, Object3D } from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { Vector3 } from 'three'

interface LabelEntry {
  mesh: Object3D
  label: CSS2DObject
  offset: Vector3
}

export class LabelManager {
  private renderer: CSS2DRenderer
  private entries: LabelEntry[] = []
  private tmpPos = new Vector3()
  private containerElement: HTMLElement

  constructor(containerElement: HTMLElement) {
    this.containerElement = containerElement
    this.renderer = new CSS2DRenderer()
    this.renderer.setSize(containerElement.clientWidth, containerElement.clientHeight)
    Object.assign(this.renderer.domElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
    })
    this.containerElement.appendChild(this.renderer.domElement)
  }

  add(
    scene: Scene,
    mesh: Object3D,
    text: string,
    offsetY = 0,
    customStyles?: Partial<CSSStyleDeclaration>
  ): CSS2DObject {
    const div = document.createElement('div')
    const defaultStyles: Partial<CSSStyleDeclaration> = {
      color: '#fff',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      textShadow: '1px 1px 2px black',
      padding: '2px 5px',
      borderRadius: '3px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    }
    Object.assign(div.style, defaultStyles, customStyles)
    div.textContent = text

    const label = new CSS2DObject(div)
    scene.add(label)

    const offset = new Vector3(0, offsetY, 0)
    this.entries.push({ mesh, label, offset })
    return label
  }

  remove(mesh: Object3D): boolean {
    const index = this.entries.findIndex(entry => entry.mesh === mesh)
    if (index !== -1) {
      const entry = this.entries[index]
      if (entry.label.parent) {
        entry.label.parent.remove(entry.label)
      }
      if (entry.label.element.parentNode) {
        entry.label.element.parentNode.removeChild(entry.label.element)
      }
      this.entries.splice(index, 1)
      return true
    }
    return false
  }

  clearAll() {
    for (const { label } of this.entries) {
      if (label.parent) {
        label.parent.remove(label)
      }
      if (label.element.parentNode) {
        label.element.parentNode.removeChild(label.element)
      }
    }
    this.entries = []
  }

  updateSize(width: number, height: number) {
    this.renderer.setSize(width, height)
  }

  render(scene: Scene, camera: Camera) {
    for (const { mesh, label, offset } of this.entries) {
      mesh.getWorldPosition(this.tmpPos)
      label.position.copy(this.tmpPos).add(offset)
    }
    this.renderer.render(scene, camera)
  }

  dispose() {
    this.clearAll()
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }
} 