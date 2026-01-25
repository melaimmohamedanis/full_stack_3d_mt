import React, { useMemo } from 'react';
import { Text, Line } from '@react-three/drei';

interface AxesMeshProps {
  northCoords: number[];
  eastCoords: number[];
  depth: number;
}

const AxesMesh: React.FC<AxesMeshProps> = ({ northCoords, eastCoords, depth }) => {
  const minN = Math.min(...northCoords);
  const maxN = Math.max(...northCoords);
  const minE = Math.min(...eastCoords);
  const maxE = Math.max(...eastCoords);

  const gridColor = "#444444";
  const textColor = "#000000";
  const labelSize = 0.7;

  // Define grid intervals (e.g., every 5km)
  const step = 5;

  // Helper to get clean rounded values for grid lines
  const getGridPoints = (min: number, max: number) => {
    const points = [];
    for (let val = Math.ceil(min / step) * step; val <= max; val += step) {
      points.push(val);
    }
    return points;
  };

  const nGrid = useMemo(() => getGridPoints(minN, maxN), [minN, maxN]);
  const eGrid = useMemo(() => getGridPoints(minE, maxE), [minE, maxE]);
  const dGrid = useMemo(() => {
    const points = [];
    for (let d = 0; d <= depth; d += step) points.push(d);
    return points;
  }, [depth]);

  return (
    <group>
      {/* 1. NORTH-SOUTH GRID LINES (Running along X) */}
      {nGrid.map((x) => (
        <group key={`nx-${x}`}>
          {/* Line across the bottom face */}
          <Line points={[[x, minE, depth], [x, maxE, depth]]} color={gridColor} lineWidth={0.5} transparent opacity={0.3} />
          {/* Line up the side walls */}
          <Line points={[[x, minE, 0], [x, minE, depth]]} color={gridColor} lineWidth={0.5} />
          <Line points={[[x, maxE, 0], [x, maxE, depth]]} color={gridColor} lineWidth={0.5} />
          {/* Label at the top */}
          <Text position={[x, minE - 1, 0]} fontSize={labelSize} color={textColor} rotation={[-Math.PI / 2, 0, 0]}>
            {x.toFixed(1)}
          </Text>
        </group>
      ))}

      {/* 2. EAST-WEST GRID LINES (Running along Y) */}
      {eGrid.map((y) => (
        <group key={`ey-${y}`}>
          {/* Line across the bottom face */}
          <Line points={[[minN, y, depth], [maxN, y, depth]]} color={gridColor} lineWidth={0.5} transparent opacity={0.3} />
          {/* Line up the side walls */}
          <Line points={[[minN, y, 0], [minN, y, depth]]} color={gridColor} lineWidth={0.5} />
          <Line points={[[maxN, y, 0], [maxN, y, depth]]} color={gridColor} lineWidth={0.5} />
          {/* Label at the top */}
          <Text position={[minN - 2, y, 0]} fontSize={labelSize} color={textColor} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            {y.toFixed(1)}
          </Text>
        </group>
      ))}

      {/* 3. DEPTH GRID LINES (Horizontal slices) */}
      {dGrid.map((z) => (
        <group key={`dz-${z}`}>
          {/* Rectangle at this depth */}
          <Line 
            points={[[minN, minE, z], [maxN, minE, z], [maxN, maxE, z], [minN, maxE, z], [minN, minE, z]]} 
            color={gridColor} 
            lineWidth={0.5}
            transparent
            opacity={z === 0 || z === depth ? 1 : 0.2} // Brighten top and bottom
          />
          {/* Depth Label */}
          <Text position={[minN - 1, minE - 1, z]} fontSize={labelSize} color={textColor}>
            {z}
          </Text>
        </group>
      ))}

      {/* AXIS TITLES */}
      <Text position={[(minN + maxN) / 2, minE - 5, 0]} fontSize={1.2} color="yellow">North UTM (km)</Text>
      <Text position={[minN - 5, (minE + maxE) / 2, 0]} fontSize={1.2} color="yellow" rotation={[0, 0, Math.PI / 2]}>East UTM (km)</Text>
    </group>
  );
};

export default AxesMesh;