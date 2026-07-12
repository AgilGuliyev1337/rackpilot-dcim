import { Suspense, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import { ArrowLeft, Boxes, Map } from 'lucide-react'
import { getFloorPlan } from '../api/rooms'
import { useAsync } from '../hooks/useAsync'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { utilizationBand, UTIL_HEX } from '../lib/utilization'
import type { FloorPlanRack } from '../types'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

const U_TO_UNIT = 0.06 // world height per U (42U ≈ 2.5 tall)

function RackBox({
  rack,
  floorWidth,
  floorHeight,
  onClick,
}: {
  rack: FloorPlanRack
  floorWidth: number
  floorHeight: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const height = Math.max(0.3, rack.u_height * U_TO_UNIT)
  const color = UTIL_HEX[utilizationBand(rack.utilization_percent)]
  // rack footprint centered within the floor plane (floor centered at origin)
  const x = rack.pos_x + rack.width_units / 2 - floorWidth / 2
  const z = rack.pos_y + rack.depth_units / 2 - floorHeight / 2

  return (
    <mesh
      position={[x, height / 2, z]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={[rack.width_units, height, rack.depth_units]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 0.5 : 0.15}
        metalness={0.3}
        roughness={0.6}
      />
      {hovered && (
        <Html center distanceFactor={20} position={[0, height / 2 + 0.6, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded bg-surface-900/90 px-2 py-1 text-[11px] text-white shadow">
            {rack.name} · {rack.utilization_percent}% · {rack.device_count} devices
          </div>
        </Html>
      )}
    </mesh>
  )
}

function Scene({
  racks,
  floorWidth,
  floorHeight,
  onPick,
}: {
  racks: FloorPlanRack[]
  floorWidth: number
  floorHeight: number
  onPick: (id: number) => void
}) {
  const maxDim = Math.max(floorWidth, floorHeight)
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[maxDim, maxDim * 1.5, maxDim]} intensity={1.1} />
      <Grid
        args={[floorWidth, floorHeight]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#475569"
        position={[0, 0, 0]}
        infiniteGrid={false}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[floorWidth, floorHeight]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {racks.map((rack) => (
        <RackBox
          key={rack.id}
          rack={rack}
          floorWidth={floorWidth}
          floorHeight={floorHeight}
          onClick={() => onPick(rack.id)}
        />
      ))}
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
    </>
  )
}

export function Room3DPage() {
  const { dcId, roomId } = useParams()
  const rid = Number(roomId)
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => getFloorPlan(rid), [rid])
  const webgl = useMemo(hasWebGL, [])

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[560px]" />
      </div>
    )
  }

  const camDist = Math.max(data.floor_width, data.floor_height)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to={dcId ? `/datacenters/${dcId}` : '/datacenters'}
            className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
          >
            <ArrowLeft size={12} /> Back
          </Link>
          <h1 className="text-lg font-semibold">{data.room_name} — 3D view</h1>
          <p className="text-xs text-surface-500">
            Drag to orbit · scroll to zoom · click a rack to open its elevation
          </p>
        </div>
        <Link
          to={`/datacenters/${dcId}/rooms/${rid}/floorplan`}
          className="inline-flex items-center gap-1 rounded-md border border-surface-300 px-2.5 py-1.5 text-xs font-medium hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
        >
          <Map size={13} /> 2D floor plan
        </Link>
      </div>

      <Card className="overflow-hidden p-0">
        {!webgl ? (
          <EmptyState
            icon={Boxes}
            title="3D view unavailable"
            description="Your browser or device does not support WebGL."
            action={
              <Link
                to={`/datacenters/${dcId}/rooms/${rid}/floorplan`}
                className="text-sm text-accent-600 hover:underline dark:text-accent-400"
              >
                Open the 2D floor plan instead →
              </Link>
            }
          />
        ) : (
          <div className="h-[560px] w-full bg-[#0b1120]">
            <Canvas camera={{ position: [camDist * 0.8, camDist * 0.9, camDist * 1.1], fov: 45 }}>
              <Suspense fallback={null}>
                <Scene
                  racks={data.racks}
                  floorWidth={data.floor_width}
                  floorHeight={data.floor_height}
                  onPick={(id) => navigate(`/racks/${id}`)}
                />
              </Suspense>
            </Canvas>
          </div>
        )}
      </Card>
    </div>
  )
}
