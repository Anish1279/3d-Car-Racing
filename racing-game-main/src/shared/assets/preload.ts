import { useGLTF, useTexture } from '@react-three/drei'

const textureAssets = ['/textures/heightmap_1024.png'] as const
const modelAssets = ['/models/track-draco.glb', '/models/chassis-draco.glb', '/models/wheel-draco.glb'] as const

textureAssets.forEach((assetPath) => useTexture.preload(assetPath))
modelAssets.forEach((assetPath) => useGLTF.preload(assetPath))
