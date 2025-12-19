export type ShapeType = 'line' | 'circle' | 'text' | 'triangle' | 'square';

export interface Point {
    x: number;
    y: number;
}

export interface IShape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    rotation?: number;
    draggable: boolean;
    isSelected?: boolean;
}

export interface ILine extends IShape {
    type: 'line';
    points: number[]; // [x1, y1, x2, y2...] relative to x,y
    stroke: string;
    strokeWidth: number;
}

export interface ICircle extends IShape {
    type: 'circle';
    radius: number;
    stroke: string;
    fill?: string;
}

export interface IText extends IShape {
    type: 'text';
    text: string;
    fontSize: number;
    fill: string;
}

export interface ITriangle extends IShape {
    type: 'triangle';
    points: number[]; // [x1, y1, x2, y2, x3, y3] relative to x,y
    stroke: string;
    strokeWidth: number;
    fill?: string;
}

export interface ISquare extends IShape {
    type: 'square';
    width: number;
    height: number;
    stroke: string;
    strokeWidth: number;
    fill?: string;
}

// Factory Interface
export interface IShapeFactory {
    createShape(type: ShapeType, props: Partial<IShape>): IShape;
}
