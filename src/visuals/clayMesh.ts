import * as THREE from 'three'
import type { ClayProfile } from '../game/types'

export function createClayGeometry(profile: ClayProfile, radialSegments = 64): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [new THREE.Vector2(0, 0)]
  const last = profile.outerRadii.length - 1

  profile.outerRadii.forEach((radius, index) => {
    points.push(new THREE.Vector2(radius, profile.height * (index / last)))
  })
  for (let index = last; index >= 0; index -= 1) {
    points.push(new THREE.Vector2(profile.innerRadii[index], profile.height * (index / last)))
  }
  points.push(new THREE.Vector2(0, 0))

  const geometry = new THREE.LatheGeometry(points, radialSegments)
  geometry.computeVertexNormals()
  return geometry
}

export function replaceMeshGeometry(mesh: THREE.Mesh, profile: ClayProfile): void {
  const previous = mesh.geometry
  mesh.geometry = createClayGeometry(profile)
  previous.dispose()
}
