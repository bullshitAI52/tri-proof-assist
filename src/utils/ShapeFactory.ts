import { IShape, ShapeType, ILine, ICircle, IText, ITriangle, ISquare, IShapeFactory } from '../types/shapes';

export class ShapeFactory implements IShapeFactory {
    createShape(type: ShapeType, props: any = {}): IShape {
        const id = crypto.randomUUID();
        const baseDefaults = {
            id,
            x: 100,
            y: 100,
            rotation: 0,
            draggable: true,
            isSelected: false,
        };

        switch (type) {
            case 'line':
                return {
                    ...baseDefaults,
                    type: 'line',
                    points: [0, 0, 100, 100],
                    stroke: '#00D2FF', // Neon Blue
                    strokeWidth: 4,
                    ...props,
                } as ILine;

            case 'circle':
                return {
                    ...baseDefaults,
                    type: 'circle',
                    radius: 50,
                    stroke: '#00D2FF',
                    fill: 'transparent',
                    ...props,
                } as ICircle;

            case 'text':
                return {
                    ...baseDefaults,
                    type: 'text',
                    text: 'Double click to edit',
                    fontSize: 20,
                    fill: '#ffffff',
                    ...props,
                } as IText;

            case 'triangle':
                return {
                    ...baseDefaults,
                    type: 'triangle',
                    points: [0, 100, 50, 0, 100, 100], // Equilateral-ish relative points
                    stroke: '#00D2FF',
                    strokeWidth: 4,
                    fill: 'rgba(0, 210, 255, 0.1)',
                    ...props,
                } as ITriangle;

            case 'square':
                return {
                    ...baseDefaults,
                    type: 'square',
                    width: 100,
                    height: 100,
                    stroke: '#00D2FF',
                    strokeWidth: 4,
                    fill: 'rgba(0, 210, 255, 0.1)',
                    ...props,
                } as ISquare;

            default:
                throw new Error(`Shape type ${type} not supported`);
        }
    }
}

export const shapeFactory = new ShapeFactory();
