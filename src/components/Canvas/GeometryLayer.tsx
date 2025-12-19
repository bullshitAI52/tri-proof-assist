import React from 'react';
import { Layer, Line, Circle, Text, Transformer, Group } from 'react-konva';
import { IShape, ILine, ICircle, IText, ITriangle, ISquare } from '../../types/shapes';

interface GeometryLayerProps {
    shapes: IShape[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onChange: (newShapes: IShape[]) => void;
}

const SNAP_SIZE = 20;

const GeometryLayer: React.FC<GeometryLayerProps> = ({ shapes, selectedId, onSelect, onChange }) => {
    const trRef = React.useRef<any>(null);

    React.useEffect(() => {
        if (selectedId && trRef.current) {
            const stage = trRef.current.getStage();
            const selectedNode = stage.findOne('.' + selectedId);
            if (selectedNode) {
                trRef.current.nodes([selectedNode]);
                trRef.current.getLayer().batchDraw();
            }
        } else if (!selectedId && trRef.current) {
            trRef.current.nodes([]);
            trRef.current.getLayer().batchDraw();
        }
    }, [selectedId, shapes]);

    const checkDeselect = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.name === 'grid-line';
        if (clickedOnEmpty) {
            onSelect(null);
        }
    };

    const snapToGrid = (val: number) => Math.round(val / SNAP_SIZE) * SNAP_SIZE;

    const handleDragEnd = (e: any, id: string) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === id) {
                return {
                    ...shape,
                    x: snapToGrid(e.target.x()),
                    y: snapToGrid(e.target.y()),
                    rotation: e.target.rotation() || 0,
                };
            }
            return shape;
        });
        onChange(updatedShapes);
    };

    return (
        <Layer onMouseDown={checkDeselect} onTouchStart={checkDeselect}>
            {/* Grid Visualization */}
            <Group>
                {Array.from({ length: 50 }).map((_, i) => (
                    <React.Fragment key={i}>
                        <Line
                            points={[i * SNAP_SIZE, 0, i * SNAP_SIZE, 2000]}
                            stroke="#334155"
                            strokeWidth={1}
                            opacity={0.2}
                            listening={false}
                            name="grid-line"
                        />
                        <Line
                            points={[0, i * SNAP_SIZE, 2000, i * SNAP_SIZE]}
                            stroke="#334155"
                            strokeWidth={1}
                            opacity={0.2}
                            listening={false}
                            name="grid-line"
                        />
                    </React.Fragment>
                ))}
            </Group>

            {shapes.map((shape) => {
                const commonProps = {
                    key: shape.id,
                    id: shape.id,
                    name: shape.id,
                    x: shape.x,
                    y: shape.y,
                    draggable: shape.draggable,
                    rotation: shape.rotation,
                    onClick: () => onSelect(shape.id),
                    onTap: () => onSelect(shape.id),
                    onDragEnd: (e: any) => handleDragEnd(e, shape.id),
                    dragBoundFunc: (pos: { x: number; y: number }) => {
                        return {
                            x: snapToGrid(pos.x),
                            y: snapToGrid(pos.y),
                        };
                    }
                };

                if (shape.type === 'line') {
                    const s = shape as ILine;
                    return (
                        <Line
                            {...commonProps}
                            points={s.points}
                            stroke={selectedId === shape.id ? '#00D2FF' : s.stroke}
                            strokeWidth={selectedId === shape.id ? s.strokeWidth + 2 : s.strokeWidth}
                            tension={0}
                            hitStrokeWidth={30}
                            shadowColor={selectedId === shape.id ? '#00D2FF' : undefined}
                            shadowBlur={selectedId === shape.id ? 10 : 0}
                            shadowOpacity={selectedId === shape.id ? 0.5 : 0}
                        />
                    );
                } else if (shape.type === 'circle') {
                    const s = shape as ICircle;
                    return (
                        <Circle
                            {...commonProps}
                            radius={s.radius}
                            stroke={selectedId === shape.id ? '#00D2FF' : s.stroke}
                            strokeWidth={selectedId === shape.id ? 3 : 2}
                            fill={s.fill}
                            shadowColor={selectedId === shape.id ? '#00D2FF' : undefined}
                            shadowBlur={selectedId === shape.id ? 10 : 0}
                            shadowOpacity={selectedId === shape.id ? 0.5 : 0}
                        />
                    );
                } else if (shape.type === 'text') {
                    const s = shape as IText;
                    return (
                        <Text
                            {...commonProps}
                            text={s.text}
                            fontSize={s.fontSize}
                            fill={selectedId === shape.id ? '#00D2FF' : s.fill}
                            shadowColor={selectedId === shape.id ? '#00D2FF' : undefined}
                            shadowBlur={selectedId === shape.id ? 5 : 0}
                            shadowOpacity={selectedId === shape.id ? 0.3 : 0}
                        />
                    );
                } else if (shape.type === 'triangle') {
                    const s = shape as ITriangle;
                    return (
                        <Line
                            {...commonProps}
                            points={s.points}
                            stroke={selectedId === shape.id ? '#00D2FF' : s.stroke}
                            strokeWidth={selectedId === shape.id ? s.strokeWidth + 2 : s.strokeWidth}
                            fill={s.fill}
                            closed={true}
                            hitStrokeWidth={30}
                            shadowColor={selectedId === shape.id ? '#00D2FF' : undefined}
                            shadowBlur={selectedId === shape.id ? 10 : 0}
                            shadowOpacity={selectedId === shape.id ? 0.5 : 0}
                        />
                    );
                } else if (shape.type === 'square') {
                    const s = shape as ISquare;
                    return (
                        <Line
                            {...commonProps}
                            points={[0, 0, s.width, 0, s.width, s.height, 0, s.height]}
                            stroke={selectedId === shape.id ? '#00D2FF' : s.stroke}
                            strokeWidth={selectedId === shape.id ? s.strokeWidth + 2 : s.strokeWidth}
                            fill={s.fill}
                            closed={true}
                            hitStrokeWidth={30}
                            shadowColor={selectedId === shape.id ? '#00D2FF' : undefined}
                            shadowBlur={selectedId === shape.id ? 10 : 0}
                            shadowOpacity={selectedId === shape.id ? 0.5 : 0}
                        />
                    );
                }
                return null;
            })}

            <Transformer
                ref={trRef}
                boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) {
                        return oldBox;
                    }
                    return newBox;
                }}
                rotateEnabled={true}
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                rotationSnapTolerance={10}
                borderEnabled={true}
                borderStroke={'#00D2FF'}
                borderStrokeWidth={2}
                borderDash={[5, 5]}
                anchorStroke={'#00D2FF'}
                anchorStrokeWidth={2}
                anchorSize={10}
                keepRatio={false}
            />
        </Layer>
    );
};

export default GeometryLayer;
