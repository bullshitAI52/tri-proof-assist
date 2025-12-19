import React, { useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text } from 'react-konva';
import { save, open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { Upload, Save, FolderOpen, Trash2, Eraser, Sun, Moon, ZoomIn, ZoomOut, Sparkles, BookOpen, HelpCircle, CheckCircle, Plus, Download } from 'lucide-react';

interface TextAnnotation {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
}

interface ProofStep {
    id: string;
    becauseExpressions?: ProofExpression[];
    thereforeExpressions?: ProofExpression[];
}

interface GeometrySymbol {
    symbol: string;
    name: string;
    latex: string;
    category: 'shape' | 'relation' | 'angle' | 'line' | 'other' | 'text';
}

interface ProofExpression {
    leftSymbol: string;
    leftText: string;
    rightSymbol: string;
    rightText: string;
    relation: string;
}

const Board: React.FC = () => {
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
    const [imagePath, setImagePath] = useState<string>('');
    const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [currentColor, setCurrentColor] = useState<string>('#FF0000');
    const [pendingText, setPendingText] = useState<string>('');
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [imageScale, setImageScale] = useState(1);
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
    const [fontSize, setFontSize] = useState(28);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [proofSteps, setProofSteps] = useState<ProofStep[]>([
        {
            id: '1',
            becauseExpressions: [
                { leftSymbol: '△', leftText: 'ABC', relation: '=', rightSymbol: '△', rightText: 'DEF' }
            ],
            thereforeExpressions: [
                { leftSymbol: '△', leftText: 'ABC', relation: '≅', rightSymbol: '△', rightText: 'DEF' }
            ]
        }
    ]);
    const [topic, setTopic] = useState<string>('三角形');
    const [difficulty, setDifficulty] = useState<string>('简单');
    const [apiKey, setApiKey] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const canvasRef = React.useRef<HTMLDivElement>(null);

    // 几何符号库（按分类）
    const geometrySymbols: GeometrySymbol[] = [
        // 形状
        { symbol: '△', name: '三角形', latex: '\\triangle', category: 'shape' },
        { symbol: '□', name: '四边形', latex: '\\square', category: 'shape' },
        { symbol: '○', name: '圆', latex: '\\circ', category: 'shape' },

        // 角度
        { symbol: '∠', name: '角', latex: '\\angle', category: 'angle' },
        { symbol: '°', name: '度', latex: '^{\\circ}', category: 'angle' },
        { symbol: '′', name: '分', latex: "'", category: 'angle' },
        { symbol: '″', name: '秒', latex: '"', category: 'angle' },

        // 线段
        { symbol: '—', name: '线段', latex: '\\overline{}', category: 'line' },
        { symbol: 'AB', name: '线段AB', latex: '\\overline{AB}', category: 'line' },
        { symbol: '↔', name: '直线', latex: '\\leftrightarrow', category: 'line' },

        // 关系
        { symbol: '=', name: '等于', latex: '=', category: 'relation' },
        { symbol: '≠', name: '不等于', latex: '\\neq', category: 'relation' },
        { symbol: '≈', name: '约等于', latex: '\\approx', category: 'relation' },
        { symbol: '≅', name: '全等', latex: '\\cong', category: 'relation' },
        { symbol: '⊥', name: '垂直', latex: '\\perp', category: 'relation' },
        { symbol: '∥', name: '平行', latex: '\\parallel', category: 'relation' },
        { symbol: '→', name: '推出', latex: '\\Rightarrow', category: 'relation' },

        // 其他
        { symbol: '∵', name: '因为', latex: '\\because', category: 'other' },
        { symbol: '∴', name: '所以', latex: '\\therefore', category: 'other' },
        { symbol: '√', name: '根号', latex: '\\sqrt{}', category: 'other' },
        { symbol: 'π', name: '圆周率', latex: '\\pi', category: 'other' },
        { symbol: '∞', name: '无穷', latex: '\\infty', category: 'other' },

        // 文字
        { symbol: '中文字', name: '中文字', latex: '\\text{}', category: 'text' },
        { symbol: '角度', name: '角度', latex: '\\angle', category: 'text' },
    ];

    // 按分类分组
    const symbolsByCategory = {
        shape: geometrySymbols.filter(s => s.category === 'shape'),
        angle: geometrySymbols.filter(s => s.category === 'angle'),
        line: geometrySymbols.filter(s => s.category === 'line'),
        relation: geometrySymbols.filter(s => s.category === 'relation'),
        relationship: geometrySymbols.filter(s => s.category === 'relation'),
        other: geometrySymbols.filter(s => s.category === 'other'),
        text: geometrySymbols.filter(s => s.category === 'text'),
    };

    // 证明模板
    const proofTemplates = [
        {
            name: '三角形全等证明',
            steps: [
                { because: 'AB = DE', therefore: '对应边相等' },
                { because: '∠A = ∠D', therefore: '对应角相等' },
                { because: 'AC = DF', therefore: '对应边相等' },
                { because: '三边对应相等', therefore: '△ABC ≅ △DEF (SSS)' }
            ]
        },
        {
            name: '平行线性质',
            steps: [
                { because: 'AB ∥ CD', therefore: '同位角相等' },
                { because: '∠1 = ∠2', therefore: '内错角相等' },
                { because: '∠2 + ∠3 = 180°', therefore: '同旁内角互补' }
            ]
        },
        {
            name: '勾股定理',
            steps: [
                { because: '△ABC是直角三角形', therefore: '∠C = 90°' },
                { because: 'a² + b² = c²', therefore: '勾股定理成立' },
                { because: '已知a=3, b=4', therefore: 'c = √(3²+4²) = 5' }
            ]
        }
    ];

    // 响应式画布尺寸
    React.useEffect(() => {
        const updateCanvasSize = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setCanvasSize({ width: rect.width, height: rect.height });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // 预设文字模板
    const textTemplates = [
        'A', 'B', 'C', 'D',
        'AB', 'BC', 'AC',
        '∠___', '∠A', '∠B',
        '△ABC', '△___',
        '___°', '90°',
        '≅', '⊥', '∥'
    ];

    const handleImageImport = async () => {
        try {
            const path = await open({
                filters: [{
                    name: 'Images',
                    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg']
                }]
            });

            if (typeof path === 'string') {
                const base64Data = await invoke('read_image_as_base64', { path }) as string;
                const img = new window.Image();
                img.onload = () => {
                    // 计算缩放比例以适应画布
                    const scaleX = canvasSize.width / img.width;
                    const scaleY = canvasSize.height / img.height;
                    const scale = Math.min(scaleX, scaleY, 1); // 最大不超过原始尺寸

                    setBackgroundImage(img);
                    setImagePath(path);
                    setImageScale(scale);
                    setAnnotations([]);
                };
                img.src = base64Data;
            }
        } catch (err) {
            console.error(err);
            alert('导入图片失败: ' + err);
        }
    };

    const handleCanvasClick = (e: any) => {
        if (!pendingText) return;

        const stage = e.target.getStage();
        const pointerPos = stage.getPointerPosition();

        if (!pointerPos) return;

        const newAnnotation: TextAnnotation = {
            id: `text-${Date.now()}`,
            x: pointerPos.x,
            y: pointerPos.y,
            text: pendingText,
            color: currentColor,
            fontSize: fontSize,
        };

        setAnnotations([...annotations, newAnnotation]);
        setSelectedId(newAnnotation.id);
        setPendingText(''); // 清除待添加文字
    };

    const clearCanvas = () => {
        if (confirm('确定要清空所有标注吗？')) {
            setAnnotations([]);
            setSelectedId(null);
        }
    };

    const zoomIn = () => {
        setImageScale(prev => Math.min(prev * 1.2, 3));
    };

    const zoomOut = () => {
        setImageScale(prev => Math.max(prev / 1.2, 0.1));
    };

    const deleteSelectedAnnotation = () => {
        if (selectedId) {
            setAnnotations(annotations.filter(a => a.id !== selectedId));
            setSelectedId(null);
        }
    };

    const updateAnnotationText = (id: string, newText: string) => {
        setAnnotations(annotations.map(a =>
            a.id === id ? { ...a, text: newText } : a
        ));
    };

    const handleSave = async () => {
        try {
            const projectState = JSON.stringify({
                imagePath,
                annotations,
                proofSteps,
                fontSize,
                isDarkMode
            }, null, 2);
            const path = await save({
                filters: [{ name: 'Proof Project', extensions: ['proof', 'json'] }]
            });
            if (path) {
                await invoke('save_file', { path, content: projectState });
                alert('项目已保存!');
            }
        } catch (err) {
            console.error(err);
            alert('保存失败');
        }
    };

    const handleLoad = async () => {
        try {
            const path = await open({
                filters: [{ name: 'Proof Project', extensions: ['proof', 'json'] }]
            });
            if (typeof path === 'string') {
                const content = await invoke('read_file', { path }) as string;
                const data = JSON.parse(content);

                if (data.imagePath) {
                    const base64Data = await invoke('read_image_as_base64', { path: data.imagePath }) as string;
                    const img = new window.Image();
                    img.onload = () => {
                        setBackgroundImage(img);
                        setImagePath(data.imagePath);
                    };
                    img.src = base64Data;
                }

                setAnnotations(data.annotations || []);
                setProofSteps(data.proofSteps || [{ id: '1', because: '', therefore: '' }]);
                setFontSize(data.fontSize || 28);
                setIsDarkMode(data.isDarkMode || false);
                setSelectedId(null);
            }
        } catch (err) {
            console.error(err);
            alert('加载失败');
        }
    };

    const selectedAnnotation = annotations.find(a => a.id === selectedId);

    // 证明步骤相关函数
    const addStep = () => {
        setProofSteps([...proofSteps, {
            id: Date.now().toString(),
            becauseExpressions: [
                { leftSymbol: '△', leftText: '', relation: '=', rightSymbol: '△', rightText: '' }
            ],
            thereforeExpressions: [
                { leftSymbol: '△', leftText: '', relation: '=', rightSymbol: '△', rightText: '' }
            ]
        }]);
    };

    const removeStep = (id: string) => {
        if (proofSteps.length > 1) {
            setProofSteps(proofSteps.filter(s => s.id !== id));
        }
    };

    const updateExpression = (stepId: string, type: 'because' | 'therefore', exprIndex: number, field: keyof ProofExpression, value: string) => {
        setProofSteps(proofSteps.map(step => {
            if (step.id === stepId) {
                const expressions = type === 'because' ? step.becauseExpressions : step.thereforeExpressions;
                if (expressions) {
                    const newExpressions = [...expressions];
                    newExpressions[exprIndex] = { ...newExpressions[exprIndex], [field]: value };
                    return {
                        ...step,
                        [type === 'because' ? 'becauseExpressions' : 'thereforeExpressions']: newExpressions
                    };
                }
            }
            return step;
        }));
    };

    const addExpression = (stepId: string, type: 'because' | 'therefore') => {
        setProofSteps(proofSteps.map(step => {
            if (step.id === stepId) {
                const expressions = type === 'because' ? step.becauseExpressions : step.thereforeExpressions;
                const newExpressions = expressions || [];
                return {
                    ...step,
                    [type === 'because' ? 'becauseExpressions' : 'thereforeExpressions']: [
                        ...newExpressions,
                        { leftSymbol: '△', leftText: '', relation: '=', rightSymbol: '△', rightText: '' }
                    ]
                };
            }
            return step;
        }));
    };

    const removeExpression = (stepId: string, type: 'because' | 'therefore', exprIndex: number) => {
        setProofSteps(proofSteps.map(step => {
            if (step.id === stepId) {
                const expressions = type === 'because' ? step.becauseExpressions : step.thereforeExpressions;
                if (expressions) {
                    const newExpressions = expressions.filter((_, idx) => idx !== exprIndex);
                    return {
                        ...step,
                        [type === 'because' ? 'becauseExpressions' : 'thereforeExpressions']: newExpressions
                    };
                }
            }
            return step;
        }));
    };

    const loadTemplate = (template: any) => {
        const newSteps = template.steps.map((step: any, index: number) => ({
            id: (index + 1).toString(),
            because: step.because,
            therefore: step.therefore
        }));
        setProofSteps(newSteps);
    };

    const generateProof = async () => {
        setIsGenerating(true);
        try {
            const result = await invoke('generate_problem', {
                topic,
                difficulty,
                apiKey
            }) as string;

            // 解析AI返回的结果
            const data = JSON.parse(result);

            // 显示成功消息
            alert(`✅ AI生成成功!\n\n标题: ${data.title}\n描述: ${data.description}`);

            // 如果AI返回了步骤，直接加载到编辑器中
            if (data.steps && Array.isArray(data.steps)) {
                const newSteps = data.steps.map((step: any, index: number) => ({
                    id: (Date.now() + index).toString(),
                    because: step.because || '',
                    therefore: step.therefore || ''
                }));
                setProofSteps(newSteps);
            }

        } catch (error) {
            console.error('生成失败:', error);
            alert('❌ 生成失败，请检查API Key或网络连接\n\n如果没有API Key，程序会使用示例数据。');
        } finally {
            setIsGenerating(false);
        }
    };

    const exportProofText = async () => {
        try {
            const proofText = proofSteps.map((step, index) => {
                const becauseLines = step.becauseExpressions?.map(expr =>
                    `  ${expr.leftSymbol}${expr.leftText} ${expr.relation} ${expr.rightSymbol}${expr.rightText}`
                ).join('\n') || '';

                const thereforeLines = step.thereforeExpressions?.map(expr =>
                    `  ${expr.leftSymbol}${expr.leftText} ${expr.relation} ${expr.rightSymbol}${expr.rightText}`
                ).join('\n') || '';

                return `步骤 ${index + 1}:\n因为:\n${becauseLines}\n所以:\n${thereforeLines}`;
            }).join('\n\n');

            const path = await save({
                filters: [{ name: 'Text File', extensions: ['txt'] }],
                defaultPath: `几何证明_${new Date().toISOString().split('T')[0]}.txt`
            });

            if (path) {
                await invoke('save_file', { path, content: proofText });
                alert('导出文本成功!');
            }
        } catch (err) {
            console.error(err);
            alert('导出失败: ' + err);
        }
    };

    const exportImage = async () => {
        try {
            if (!canvasRef.current) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stage = (canvasRef.current.querySelector('div') as any)?._konva?.getStage();
            if (!stage) {
                // 如果找不到Stage，尝试通过其他方式（通常canvasRef.current包裹了Stage）
                // 这里我们假设canvasRef直接包裹
                return;
            }

            // 获取Base64图片数据
            const dataURL = stage.toDataURL({ pixelRatio: 2 });

            const path = await save({
                filters: [{ name: 'Image', extensions: ['jpg', 'jpeg'] }],
                defaultPath: `几何板书_${new Date().toISOString().split('T')[0]}.jpg`
            });

            if (path) {
                await invoke('save_image_from_base64', { path, base64Data: dataURL });
                alert('导出图片成功!');
            }

        } catch (err) {
            console.error(err);
            alert('导出失败: ' + err);
        }
    };

    return (
        <div className={`flex h-screen w-full ${isDarkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
            {/* 左侧工具栏 - 图片标注功能 */}
            <div className={`w-80 flex flex-col border-r ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} shadow-lg`}>
                {/* 标题 */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h2 className="text-xl font-bold text-slate-800">几何标注</h2>
                    <p className="text-sm text-slate-500 mt-1">导入图片 · 添加文字</p>
                </div>

                {/* 导入图片 */}
                <div className="p-4 border-b border-slate-200">
                    <button
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition"
                        onClick={handleImageImport}
                    >
                        <Upload size={20} />
                        <span>导入几何图</span>
                    </button>
                </div>

                {/* 文字模板 */}
                <div className="p-4 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-700 mb-3">快速添加文字</div>
                    <div className="grid grid-cols-3 gap-2">
                        {textTemplates.map((template) => (
                            <button
                                key={template}
                                className={`py-3 px-2 rounded-lg border-2 transition font-semibold text-lg ${pendingText === template
                                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                                    : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                                    }`}
                                onClick={() => setPendingText(pendingText === template ? '' : template)}
                            >
                                {template}
                            </button>
                        ))}
                    </div>
                    {pendingText && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200">
                            💡 点击画布添加 "<span className="font-bold">{pendingText}</span>"
                        </div>
                    )}
                </div>

                {/* 颜色选择 */}
                <div className="p-4 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-700 mb-3">文字颜色</div>
                    <div className="flex gap-2">
                        {['#FF0000', '#0000FF', '#000000'].map((color) => (
                            <button
                                key={color}
                                className={`flex-1 h-12 rounded-lg border-2 transition ${currentColor === color ? 'border-blue-500 scale-105' : 'border-slate-300'
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setCurrentColor(color)}
                            />
                        ))}
                    </div>
                </div>

                {/* 字体大小 */}
                <div className="p-4 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-700 mb-2">文字大小: {fontSize}px</div>
                    <input
                        type="range"
                        min="16"
                        max="48"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* 工具按钮 */}
                <div className="p-4 border-b border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={clearCanvas}
                            className="py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 flex items-center justify-center gap-2 transition"
                        >
                            <Eraser size={16} />
                            <span className="text-sm font-semibold">清空</span>
                        </button>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center gap-2 transition"
                        >
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                            <span className="text-sm font-semibold">主题</span>
                        </button>
                        <button
                            onClick={zoomIn}
                            className="py-2 px-3 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 flex items-center justify-center gap-2 transition"
                        >
                            <ZoomIn size={16} />
                            <span className="text-sm font-semibold">放大</span>
                        </button>
                        <button
                            onClick={zoomOut}
                            className="py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center gap-2 transition"
                        >
                            <ZoomOut size={16} />
                            <span className="text-sm font-semibold">缩小</span>
                        </button>
                    </div>
                </div>

                {/* 编辑选中文字 */}
                {selectedAnnotation && (
                    <div className="p-4 border-b border-slate-200 bg-amber-50">
                        <div className="text-sm font-semibold text-amber-800 mb-2">编辑文字</div>
                        <input
                            type="text"
                            value={selectedAnnotation.text}
                            onChange={(e) => updateAnnotationText(selectedAnnotation.id, e.target.value)}
                            className="w-full mb-3 px-3 py-2 border-2 border-amber-300 rounded-lg text-base font-semibold focus:border-amber-500 focus:outline-none"
                            placeholder="输入文字..."
                        />
                        <button
                            className="w-full py-2 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 transition"
                            onClick={deleteSelectedAnnotation}
                        >
                            <Trash2 size={16} />
                            <span className="font-semibold">删除</span>
                        </button>
                    </div>
                )}

                {/* 文件操作 */}
                <div className="p-4 mt-auto border-t border-slate-200">
                    <div className="flex gap-2 mb-3">
                        <button
                            className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-2 transition"
                            onClick={handleSave}
                        >
                            <Save size={16} />
                            <span className="text-sm font-semibold">保存</span>
                        </button>
                        <button
                            className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-2 transition"
                            onClick={handleLoad}
                        >
                            <FolderOpen size={16} />
                            <span className="text-sm font-semibold">打开</span>
                        </button>
                    </div>
                    <div className="text-xs text-slate-500 text-center">
                        已添加 {annotations.length} 个文字标注
                    </div>
                </div>
            </div>

            {/* 中间主工作区 */}
            <div className="flex-1 flex flex-col">
                {/* 顶部标题 */}
                <div className="p-4 border-b border-slate-200 bg-white">
                    <h1 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                        <BookOpen size={28} />
                        几何证明辅助工具
                    </h1>
                    <p className="text-slate-600 mt-1">导入几何图片进行标注，同时编辑证明步骤</p>
                </div>

                <div className="flex-1 flex">
                    {/* 画布区域 */}
                    <div ref={canvasRef} className="flex-1 relative bg-white">
                        {!backgroundImage ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <Upload size={64} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-xl font-bold text-slate-400 mb-2">
                                        点击"导入几何图"开始
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        支持 PNG, JPG, SVG 等图片格式
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Stage
                                width={canvasSize.width}
                                height={canvasSize.height}
                                onClick={handleCanvasClick}
                                onMouseDown={(e) => {
                                    if (e.target === e.target.getStage()) {
                                        setSelectedId(null);
                                    }
                                }}
                            >
                                <Layer>
                                    <KonvaImage
                                        image={backgroundImage}
                                        width={backgroundImage.width * imageScale}
                                        height={backgroundImage.height * imageScale}
                                    />
                                </Layer>
                                <Layer>
                                    {annotations.map((annotation) => (
                                        <Text
                                            key={annotation.id}
                                            x={annotation.x}
                                            y={annotation.y}
                                            text={annotation.text}
                                            fontSize={annotation.fontSize}
                                            fontStyle="bold"
                                            fill={annotation.color}
                                            stroke={selectedId === annotation.id ? '#FFD700' : undefined}
                                            strokeWidth={selectedId === annotation.id ? 2 : 0}
                                            shadowColor={selectedId === annotation.id ? '#FFD700' : undefined}
                                            shadowBlur={selectedId === annotation.id ? 10 : 0}
                                            onClick={() => setSelectedId(annotation.id)}
                                            draggable
                                            onDragEnd={(e) => {
                                                setAnnotations(annotations.map(a =>
                                                    a.id === annotation.id
                                                        ? { ...a, x: e.target.x(), y: e.target.y() }
                                                        : a
                                                ));
                                            }}
                                        />
                                    ))}
                                </Layer>
                            </Stage>
                        )}
                    </div>

                    {/* 右侧证明编辑面板 */}
                    <div className={`w-96 border-l ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} flex flex-col`}>
                        {/* 简洁标题 */}
                        <div className="p-4 border-b border-slate-200 bg-white">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">证明推理</h3>
                                <div className="text-xs text-slate-500">
                                    步骤 {proofSteps.length}
                                </div>
                            </div>
                        </div>



                        {/* 证明步骤列表 - 带滚动条 */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-4">
                                {proofSteps.map((step, index) => (
                                    <div key={step.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-sm font-bold text-slate-700">步骤 {index + 1}</div>
                                            {proofSteps.length > 1 && (
                                                <button
                                                    onClick={() => removeStep(step.id)}
                                                    className="p-1 hover:bg-red-100 rounded transition"
                                                    title="删除此步骤"
                                                >
                                                    <Trash2 size={14} className="text-red-500" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* 因为：条件表达式列表 */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <label className="text-sm font-bold text-green-700">
                                                        因为
                                                    </label>
                                                </div>

                                                <div className="space-y-2 ml-8">
                                                    {step.becauseExpressions?.map((expr, exprIndex) => (
                                                        <div key={exprIndex} className="flex items-center gap-2">
                                                            <select
                                                                value={expr.leftSymbol}
                                                                onChange={(e) => updateExpression(step.id, 'because', exprIndex, 'leftSymbol', e.target.value)}
                                                                className="w-16 p-2 border border-slate-300 rounded text-sm bg-white"
                                                            >
                                                                <option value="">符号</option>
                                                                <optgroup label="形状">
                                                                    {symbolsByCategory.shape.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="角度">
                                                                    {symbolsByCategory.angle.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '∠' ? ' 角度' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="线段">
                                                                    {symbolsByCategory.line.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="文字">
                                                                    {symbolsByCategory.text.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>

                                                            <input
                                                                type="text"
                                                                value={expr.leftText}
                                                                onChange={(e) => updateExpression(step.id, 'because', exprIndex, 'leftText', e.target.value)}
                                                                className="w-20 p-2 border border-slate-300 rounded text-sm"
                                                                placeholder="输入"
                                                            />

                                                            <select
                                                                value={expr.relation}
                                                                onChange={(e) => updateExpression(step.id, 'because', exprIndex, 'relation', e.target.value)}
                                                                className="w-16 p-2 border border-slate-300 rounded text-sm bg-white"
                                                            >
                                                                <option value="=">=</option>
                                                                <option value="≠">≠</option>
                                                                <option value="≈">≈</option>
                                                                <option value="≅">≅</option>
                                                                <option value="⊥">⊥</option>
                                                                <option value="∥">∥</option>
                                                                <option value="→">→</option>
                                                            </select>

                                                            <select
                                                                value={expr.rightSymbol}
                                                                onChange={(e) => updateExpression(step.id, 'because', exprIndex, 'rightSymbol', e.target.value)}
                                                                className="w-16 p-2 border border-slate-300 rounded text-sm bg-white"
                                                            >
                                                                <option value="">符号</option>
                                                                <optgroup label="形状">
                                                                    {symbolsByCategory.shape.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="角度">
                                                                    {symbolsByCategory.angle.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '∠' ? ' 角度' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="线段">
                                                                    {symbolsByCategory.line.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>

                                                            <input
                                                                type="text"
                                                                value={expr.rightText}
                                                                onChange={(e) => updateExpression(step.id, 'because', exprIndex, 'rightText', e.target.value)}
                                                                className="w-20 p-2 border border-slate-300 rounded text-sm"
                                                                placeholder="输入"
                                                            />

                                                            {/* 删除表达式按钮 */}
                                                            {step.becauseExpressions && step.becauseExpressions.length > 1 && (
                                                                <button
                                                                    onClick={() => removeExpression(step.id, 'because', exprIndex)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* 添加表达式按钮 */}
                                                    <button
                                                        onClick={() => addExpression(step.id, 'because')}
                                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                    >
                                                        + 添加条件行
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 所以：结论表达式 */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <label className="text-sm font-bold text-red-700">
                                                        所以
                                                    </label>
                                                </div>

                                                <div className="space-y-2 ml-8">
                                                    {step.thereforeExpressions?.map((expr, exprIndex) => (
                                                        <div key={exprIndex} className="flex items-center gap-2">
                                                            <select
                                                                value={expr.leftSymbol}
                                                                onChange={(e) => updateExpression(step.id, 'therefore', exprIndex, 'leftSymbol', e.target.value)}
                                                                className="w-16 p-2 border border-slate-300 rounded text-sm bg-white"
                                                            >
                                                                <option value="">符号</option>
                                                                <optgroup label="形状">
                                                                    {symbolsByCategory.shape.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="角度">
                                                                    {symbolsByCategory.angle.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '∠' ? ' 角度' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="线段">
                                                                    {symbolsByCategory.line.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>

                                                            <input
                                                                type="text"
                                                                value={expr.leftText}
                                                                onChange={(e) => updateExpression(step.id, 'therefore', exprIndex, 'leftText', e.target.value)}
                                                                className="w-20 p-2 border border-slate-300 rounded text-sm"
                                                                placeholder="输入"
                                                            />

                                                            <select
                                                                value={expr.relation}
                                                                onChange={(e) => updateExpression(step.id, 'therefore', exprIndex, 'relation', e.target.value)}
                                                                className="w-16 p-2 border border-slate-300 rounded text-sm bg-white"
                                                            >
                                                                <option value="=">=</option>
                                                                <option value="≠">≠</option>
                                                                <option value="≈">≈</option>
                                                                <option value="≅">≅</option>
                                                                <option value="⊥">⊥</option>
                                                                <option value="∥">∥</option>
                                                                <option value="→">→</option>
                                                            </select>

                                                            <select
                                                                value={expr.rightSymbol}
                                                                onChange={(e) => updateExpression(step.id, 'therefore', exprIndex, 'rightSymbol', e.target.value)}
                                                                className="w-16 p-2 border border-slate-300 rounded text-sm bg-white"
                                                            >
                                                                <option value="">符号</option>
                                                                <optgroup label="形状">
                                                                    {symbolsByCategory.shape.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="角度">
                                                                    {symbolsByCategory.angle.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '∠' ? ' 角度' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="线段">
                                                                    {symbolsByCategory.line.map(s => (
                                                                        <option key={s.symbol} value={s.symbol}>{s.symbol}{s.symbol === '—' ? ' 线段' : ''}</option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>

                                                            <input
                                                                type="text"
                                                                value={expr.rightText}
                                                                onChange={(e) => updateExpression(step.id, 'therefore', exprIndex, 'rightText', e.target.value)}
                                                                className="w-20 p-2 border border-slate-300 rounded text-sm"
                                                                placeholder="输入"
                                                            />

                                                            {/* 删除表达式按钮 */}
                                                            {step.thereforeExpressions && step.thereforeExpressions.length > 1 && (
                                                                <button
                                                                    onClick={() => removeExpression(step.id, 'therefore', exprIndex)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* 添加表达式按钮 */}
                                                    <button
                                                        onClick={() => addExpression(step.id, 'therefore')}
                                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                    >
                                                        + 添加结论行
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 底部操作按钮 - 紧凑布局 */}
                            <div className="p-3 border-t border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-slate-600">
                                        步骤: {proofSteps.length} | 标注: {annotations.length}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={addStep}
                                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded flex items-center gap-1"
                                            title="添加新的证明步骤"
                                        >
                                            <Plus size={12} />
                                            添加步骤
                                        </button>
                                        <button
                                            onClick={exportProofText}
                                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded flex items-center gap-1"
                                            title="导出证明文本 (TXT)"
                                        >
                                            <Download size={12} />
                                            导出文本
                                        </button>
                                        <button
                                            onClick={exportImage}
                                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded flex items-center gap-1"
                                            title="导出为JPG图片 (JPG)"
                                        >
                                            <Download size={12} />
                                            导出JPG
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Board;