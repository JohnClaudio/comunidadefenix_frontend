import React, { useState, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { GripHorizontal } from 'lucide-react';
import { DecryptedText } from '@/components/DecryptedText';

export const TextNode = ({ id, data, selected }: any) => {
    const [text, setText] = useState(data.text || 'Digite seu texto aqui...');
    const [isEditing, setIsEditing] = useState(false);
    const { setNodes } = useReactFlow();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(evt.target.value);
    };

    const onBlur = () => {
        setIsEditing(false);
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    node.data = {
                        ...node.data,
                        text,
                    };
                }
                return node;
            })
        );
    };

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to end
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
    }, [isEditing]);

    return (
        <div
            className={cn(
                'min-w-[200px] rounded-lg p-3 transition-colors group relative',
                selected ? 'ring-2 ring-primary bg-secondary/80' : 'hover:bg-secondary/50',
                !isEditing && !text ? 'bg-secondary/20 border border-dashed border-muted-foreground/50' : ''
            )}
            style={{
                background: isEditing || selected ? undefined : 'transparent',
                boxShadow: 'none',
            }}
            onDoubleClick={() => setIsEditing(true)}
        >
            {/* Drag Handle (visible on hover) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground transition-opacity">
                <GripHorizontal className="w-5 h-5 flex-shrink-0" />
            </div>

            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Digite seu texto aqui..."
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-foreground outline-none text-sm leading-relaxed nodrag"
                    style={{ minHeight: '60px' }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            onBlur();
                        }
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            onBlur();
                        }
                    }}
                />
            ) : (
                <div
                    className="w-full text-foreground text-sm whitespace-pre-wrap leading-relaxed cursor-text min-h-[40px] break-words"
                    onClick={() => {
                        if (selected) {
                            setIsEditing(true);
                        }
                    }}
                >
                    {text ? <DecryptedText value={text} aria-label={text} /> : <span className="opacity-50">Duplo clique para editar...</span>}
                </div>
            )}

            {/* We might add handles if the user wants to point a TextNode to something, but for now we won't add any.
                If they want handles, we could add a couple invisible ones that activate on hover. 
                But let's keep it simple first. */}
        </div>
    );
};
