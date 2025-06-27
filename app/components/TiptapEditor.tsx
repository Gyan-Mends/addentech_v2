import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CharacterCount from '@tiptap/extension-character-count';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Minus,
  ChevronDown
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const TiptapEditor = ({ content, onChange, placeholder = "Start writing...", disabled = false, error }: TiptapEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline cursor-pointer hover:text-blue-700 dark:hover:text-blue-300',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2 shadow-sm',
        },
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Superscript,
      Subscript,
      CharacterCount,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-gray-900 dark:text-gray-100',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(() => {
    if (!editor || !fileInputRef.current) return;
    fileInputRef.current.click();
  }, [editor]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      editor.chain().focus().setImage({ src: base64 }).run();
    };
    reader.onerror = () => {
      alert('Failed to read image file');
    };
    reader.readAsDataURL(file);
    
    event.target.value = '';
  }, [editor]);

  const setTextColor = useCallback((color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  }, [editor]);

  const setHighlight = useCallback((color: string) => {
    if (!editor) return;
    editor.chain().focus().toggleHighlight({ color }).run();
    setShowHighlightPicker(false);
  }, [editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title,
    size = 'default'
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
    size?: 'default' | 'small';
  }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`
        ${size === 'small' ? 'min-w-6 h-6' : 'min-w-8 h-8'} 
        flex items-center justify-center rounded-md text-sm font-medium 
        transition-all duration-200 ease-in-out
        ${isActive 
          ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md ring-2 ring-blue-200 dark:ring-blue-400' 
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-sm border border-gray-200 dark:border-gray-600'
        }
        ${disabled 
          ? 'opacity-40 cursor-not-allowed' 
          : 'cursor-pointer hover:scale-105 active:scale-95'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-gray-800
      `}
    >
      {children}
    </button>
  );

  const ColorPicker = ({ colors, onColorSelect, isOpen, onClose }: {
    colors: string[];
    onColorSelect: (color: string) => void;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    if (!isOpen) return null;
    
    return (
      <div className="absolute top-10 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-48">
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onColorSelect(color)}
              className="w-7 h-7 rounded-md border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-all duration-200 hover:shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const textColors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F9FAFB',
    '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2',
    '#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7',
    '#065F46', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0',
    '#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE',
    '#7C2D12', '#A855F7', '#C084FC', '#D8B4FE', '#E9D5FF', '#F3E8FF'
  ];

  const highlightColors = [
    '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706',
    '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C',
    '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857',
    '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8',
    '#E9D5FF', '#D8B4FE', '#C084FC', '#A855F7', '#9333EA', '#7C3AED'
  ];

  return (
    <div className={`tiptap-editor border-2 rounded-xl bg-white dark:bg-gray-900 overflow-hidden transition-all duration-300 ${error ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} shadow-sm hover:shadow-md`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Enhanced Toolbar */}
      {!disabled && (
        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
          
          {/* Basic Text Formatting */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* Advanced Text Formatting */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive('superscript')}
              title="Superscript"
            >
              <SuperscriptIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive('subscript')}
              title="Subscript"
            >
              <SubscriptIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* Colors */}
          <div className="flex gap-1 items-center">
            <div className="relative">
              <ToolbarButton
                onClick={() => {
                  setShowHighlightPicker(false);
                  setShowColorPicker(!showColorPicker);
                }}
                title="Text Color"
              >
                <Palette className="w-4 h-4" />
              </ToolbarButton>
              <ColorPicker
                colors={textColors}
                onColorSelect={setTextColor}
                isOpen={showColorPicker}
                onClose={() => setShowColorPicker(false)}
              />
            </div>

            <div className="relative">
              <ToolbarButton
                onClick={() => {
                  setShowColorPicker(false);
                  setShowHighlightPicker(!showHighlightPicker);
                }}
                isActive={editor.isActive('highlight')}
                title="Highlight Text"
              >
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>
              <ColorPicker
                colors={highlightColors}
                onColorSelect={setHighlight}
                isOpen={showHighlightPicker}
                onClose={() => setShowHighlightPicker(false)}
              />
            </div>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* Text Alignment */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="Justify Text"
            >
              <AlignJustify className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* Headings */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <span className="text-xs font-bold">H1</span>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <span className="text-xs font-bold">H2</span>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <span className="text-xs font-bold">H3</span>
            </ToolbarButton>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* Lists & Structure */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Line"
            >
              <Minus className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* Media */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive('link')}
              title="Add/Edit Link"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={handleImageUpload}
              title="Upload Image"
            >
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

          {/* History */}
          <div className="flex gap-1 items-center">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div 
        className="relative cursor-text transition-all duration-200 min-h-[200px]"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent 
          editor={editor}
          className="tiptap-content"
        />
      </div>

      {/* Enhanced Status Bar */}
      {!disabled && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 transition-colors duration-300 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-medium">
              {editor.storage.characterCount.characters()} characters
            </span>
            <span>•</span>
            <span className="font-medium">
              {editor.storage.characterCount.words()} words
            </span>
          </div>
          <div className="text-xs opacity-60">
            Click anywhere to start writing
          </div>
        </div>
      )}

      {/* Enhanced Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .tiptap-editor .ProseMirror {
            outline: none !important;
            border: none !important;
            min-height: 200px;
            padding: 2rem;
            color: inherit;
            background: transparent;
            line-height: 1.7;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          
          .tiptap-editor .ProseMirror:focus {
            outline: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
            color: #9CA3AF;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
            font-style: italic;
          }
          
          .dark .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
            color: #9CA3AF;
          }
          
          .tiptap-editor .ProseMirror h1,
          .tiptap-editor .ProseMirror h2,
          .tiptap-editor .ProseMirror h3 {
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 1rem;
            line-height: 1.2;
          }
          
          .tiptap-editor .ProseMirror h1 {
            font-size: 2.25rem;
            color: #111827;
          }
          
          .dark .tiptap-editor .ProseMirror h1 {
            color: #F9FAFB;
          }
          
          .tiptap-editor .ProseMirror h2 {
            font-size: 1.875rem;
            color: #1F2937;
          }
          
          .dark .tiptap-editor .ProseMirror h2 {
            color: #F3F4F6;
          }
          
          .tiptap-editor .ProseMirror h3 {
            font-size: 1.5rem;
            color: #374151;
          }
          
          .dark .tiptap-editor .ProseMirror h3 {
            color: #E5E7EB;
          }
          
          .tiptap-editor .ProseMirror ul,
          .tiptap-editor .ProseMirror ol {
            margin-left: 2rem;
            margin-top: 1rem;
            margin-bottom: 1rem;
          }
          
          .tiptap-editor .ProseMirror li {
            margin-bottom: 0.5rem;
          }
          
          .tiptap-editor .ProseMirror blockquote {
            border-left: 4px solid #3B82F6;
            margin: 2rem 0;
            padding: 1.5rem 2rem;
            font-style: italic;
            color: #4B5563;
            background-color: #F8FAFC;
            border-radius: 0.75rem;
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .dark .tiptap-editor .ProseMirror blockquote {
            border-left-color: #60A5FA;
            color: #9CA3AF;
            background-color: #1E293B;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          }
          
          .tiptap-editor .ProseMirror code {
            background-color: #F3F4F6;
            color: #DC2626;
            border-radius: 0.375rem;
            padding: 0.25rem 0.5rem;
            font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.875em;
            font-weight: 600;
            border: 1px solid #D1D5DB;
          }
          
          .dark .tiptap-editor .ProseMirror code {
            background-color: #374151;
            color: #F87171;
            border-color: #4B5563;
          }
          
          .tiptap-editor .ProseMirror a {
            color: #3B82F6;
            text-decoration: none;
            text-underline-offset: 3px;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
          }
          
          .tiptap-editor .ProseMirror a:hover {
            color: #2563EB;
            border-bottom-color: #60A5FA;
          }
          
          .dark .tiptap-editor .ProseMirror a {
            color: #60A5FA;
          }
          
          .dark .tiptap-editor .ProseMirror a:hover {
            color: #93C5FD;
            border-bottom-color: #3B82F6;
          }
          
          .tiptap-editor .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s ease;
          }
          
          .tiptap-editor .ProseMirror img:hover {
            transform: scale(1.02);
          }
          
          .dark .tiptap-editor .ProseMirror img {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          }
          
          .tiptap-editor .ProseMirror hr {
            border: none;
            height: 2px;
            background-color: #E5E7EB;
            margin: 3rem 0;
          }
          
          .dark .tiptap-editor .ProseMirror hr {
            background-color: #4B5563;
          }
          
          .tiptap-editor .ProseMirror mark {
            padding: 0.125rem 0.375rem;
            border-radius: 0.375rem;
            font-weight: 500;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .tiptap-editor .ProseMirror sup,
          .tiptap-editor .ProseMirror sub {
            font-size: 0.75em;
            font-weight: 600;
          }
          
          .tiptap-editor .ProseMirror p {
            margin: 1rem 0;
          }
          
          .tiptap-editor .ProseMirror p:first-child {
            margin-top: 0;
          }
          
          .tiptap-editor .ProseMirror p:last-child {
            margin-bottom: 0;
          }
        `
      }} />
    </div>
  );
};

export default TiptapEditor; 