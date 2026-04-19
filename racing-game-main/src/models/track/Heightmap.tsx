import { useTexture } from '@react-three/drei'
import { RigidBody, HeightfieldCollider, interactionGroups } from '@react-three/rapier'
import { useMemo } from 'react'
import type { Texture } from 'three'
import { COLLISION_GROUP_CHASSIS, COLLISION_GROUP_ENVIRONMENT } from '../../physics/constants'

// Create canvas for reading heightmap pixel data
const canvas = document.createElement('canvas')
const context = canvas.getContext('2d')
if (context) context.imageSmoothingEnabled = false

function createHeightfieldData(image: HTMLImageElement): { heights: Float32Array, width: number, height: number } {
  if (!context) throw new Error('Cannot create 2D context for heightfield')

  const width = image.width
  const height = image.height
  const scale = 40 // vertical scale of the heightmap

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const { data } = context.getImageData(0, 0, width, height)
  const heights = new Float32Array(width * height)

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const p = (data[4 * (y * width + x)] * scale) / 255
      heights[x * height + y] = Math.max(0, p) / 4
    }
  }

  context.clearRect(0, 0, width, height)
  return { heights, width, height }
}

interface HeightmapProps {
  elementSize: number
  position: [number, number, number]
  rotation: [number, number, number]
}

export function Heightmap({ elementSize, position, rotation }: HeightmapProps) {
  const heightmap = useTexture('/textures/heightmap_1024.png')

  const { heights, width, height } = useMemo(() => {
    return createHeightfieldData(heightmap.image as HTMLImageElement)
  }, [heightmap])

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
      rotation={rotation}
      collisionGroups={interactionGroups(COLLISION_GROUP_ENVIRONMENT, [COLLISION_GROUP_CHASSIS])}
      friction={0.6}
    >
      <HeightfieldCollider
        args={[width - 1, height - 1, Array.from(heights), { x: width * elementSize, y: 1, z: height * elementSize }]}
      />
    </RigidBody>
  )
}
