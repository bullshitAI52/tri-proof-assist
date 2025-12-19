import React, { useEffect, useRef } from 'react';
import { IShape, ShapeType, ILine, ICircle, IText, ITriangle } from '../../types/shapes';
import katex from 'katex';

interface ShapeInspectorProps {
    selectedShape: IShape | null;
    onUpdate: (updatedShape: IShape) => void;
}

const LatexPreview: React.FC<{ text: string }> = ({ text }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            try {
                katex.render(text, containerRef.current, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (e) {
                containerRef.current.innerText = text; // fallback
            }
        }
    }, [text]);

    return <div ref={containerRef} className="text-black" />;
};

const ShapeInspector: React.FC<ShapeInspectorProps> = ({ selectedShape, onUpdate }) => {
    if (!selectedShape) {
        return (
            <div className="p-4 text-slate-500 text-sm text-center">
                Select a shape to edit properties
            </div>
        );
    }

    const handleChange = (key: keyof IShape | string, value: any) => {
        onUpdate({
            ...selectedShape,
            [key]: value,
        });
    };

    return (
        <div className="p-4 space-y-4 bg-slate-800/50 rounded-lg border border-slate-700 m-2">
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-2">
                Properties: {selectedShape.type}
            </h3>

            <div className="space-y-3">
                {/* Common Props */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-slate-400">X</label>
                        <input
                            type="number"
                            value={Math.round(selectedShape.x)}
                            onChange={(e) => handleChange('x', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400">Y</label>
                        <input
                            type="number"
                            value={Math.round(selectedShape.y)}
                            onChange={(e) => handleChange('y', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                        />
                    </div>
                </div>

                {/* Type Specific Props */}
                {selectedShape.type === 'text' && (
                    <div>
                        <label className="text-xs text-slate-400">Content (Supports LaTeX)</label>
                        <input
                            type="text"
                            value={(selectedShape as IText).text}
                            onChange={(e) => handleChange('text', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-mono"
                        />
                        {/* LaTeX Preview */}
                        <div className="mt-2 p-2 bg-white rounded min-h-[40px] flex items-center justify-center border border-slate-300">
                            <LatexPreview text={(selectedShape as IText).text} />
                        </div>

                        <label className="text-xs text-slate-400 mt-2 block">Font Size</label>
                        <input
                            type="number"
                            value={(selectedShape as IText).fontSize}
                            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                        />
                    </div>
                )}

                {(selectedShape.type === 'line' || selectedShape.type === 'circle' || selectedShape.type === 'triangle') && (
                    <div>
                        <label className="text-xs text-slate-400">Stroke Color</label>
                        <div className="flex gap-2 mt-1">
                            {['#00D2FF', '#EF4444', '#10B981', '#F59E0B', '#FFFFFF'].map(color => (
                                <button
                                    key={color}
                                    className={`w-6 h-6 rounded-full border ${// @ts-ignore
                                        selectedShape.stroke === color ? 'border-white ring-2 ring-blue-500' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleChange('stroke', color)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShapeInspector;
