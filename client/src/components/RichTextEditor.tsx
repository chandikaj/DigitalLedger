import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useState, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { hasPipeTableContent, buildMixedHTML, linkifyHTML } from '@/lib/tableUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Type,
  Table as TableIcon,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const FONT_FAMILIES = [
  { value: 'default', label: 'Default' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Helvetica', label: 'Helvetica' },
];

const TEXT_COLORS = [
  { value: 'default', label: 'Default' },
  { value: '#000000', label: 'Black' },
  { value: '#FF0000', label: 'Red' },
  { value: '#0000FF', label: 'Blue' },
  { value: '#008000', label: 'Green' },
  { value: '#FFA500', label: 'Orange' },
  { value: '#800080', label: 'Purple' },
  { value: '#808080', label: 'Gray' },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
}: RichTextEditorProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [hoverTooltip, setHoverTooltip] = useState<{
    href: string;
    x: number;
    y: number;
    anchor: HTMLAnchorElement;
  } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      FontFamily.configure({ types: ['textStyle'] }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: false,
        HTMLAttributes: { class: 'article-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: hasPipeTableContent(content) ? buildMixedHTML(content) : content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] max-w-none p-4',
      },
      transformPastedHTML(html) {
        return linkifyHTML(html);
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (!hasPipeTableContent(text)) return;
      e.preventDefault();
      e.stopPropagation();
      const html = buildMixedHTML(text);
      if (html) {
        editor.commands.insertContent(linkifyHTML(html));
      }
    };
    dom.addEventListener('paste', onPaste, true);
    return () => dom.removeEventListener('paste', onPaste, true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onClickLink = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      e.preventDefault();
      const href = anchor.getAttribute('href') || '';
      setLinkUrl(href);
      setLinkPopoverOpen(true);
    };
    dom.addEventListener('click', onClickLink);
    return () => dom.removeEventListener('click', onClickLink);
  }, [editor]);

  useEffect(() => {
    if (linkPopoverOpen && linkInputRef.current) {
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  }, [linkPopoverOpen]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href) return;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        const rect = anchor.getBoundingClientRect();
        const tooltipWidth = 340;
        const tooltipHeight = 36;
        const x = Math.min(rect.left, window.innerWidth - tooltipWidth - 8);
        const y = rect.bottom + 6 + tooltipHeight > window.innerHeight
          ? rect.top - tooltipHeight - 6
          : rect.bottom + 6;
        setHoverTooltip({ href, x: Math.max(8, x), y, anchor });
      }, 150);
    };

    const onMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related && tooltipRef.current?.contains(related)) return;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => setHoverTooltip(null), 100);
    };

    dom.addEventListener('mouseover', onMouseOver);
    dom.addEventListener('mouseout', onMouseOut);
    return () => {
      dom.removeEventListener('mouseover', onMouseOver);
      dom.removeEventListener('mouseout', onMouseOut);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [editor]);

  if (!editor) return null;

  const isLinkActive = editor.isActive('link');

  const openLinkPopover = () => {
    const existingHref = editor.getAttributes('link').href || '';
    setLinkUrl(existingHref);
    setLinkPopoverOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let url = linkUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkPopoverOpen(false);
    setLinkUrl('');
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkPopoverOpen(false);
    setLinkUrl('');
  };

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      onClick={onClick}
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      className={cn('h-8 w-8 p-0', isActive && 'bg-primary text-primary-foreground')}
      title={title}
      data-testid={`toolbar-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {children}
    </Button>
  );

  return (
    <div
      className={cn('border rounded-lg overflow-hidden', className)}
      data-testid="rich-text-editor"
    >
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-2 items-center">
        {/* Font Family */}
        <Select
          value={editor.getAttributes('textStyle').fontFamily || 'default'}
          onValueChange={(value) => {
            if (value === 'default') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[140px]" data-testid="select-font-family">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value} data-testid={`font-${font.value}`}>
                <span style={{ fontFamily: font.value !== 'default' ? font.value : undefined }}>
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Text Color */}
        <Select
          value={editor.getAttributes('textStyle').color || 'default'}
          onValueChange={(value) => {
            if (value === 'default') {
              editor.chain().focus().unsetColor().run();
            } else {
              editor.chain().focus().setColor(value).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[110px]" data-testid="select-text-color">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {TEXT_COLORS.map((color) => (
              <SelectItem key={color.value} value={color.value} data-testid={`color-${color.label.toLowerCase()}`}>
                <div className="flex items-center gap-2">
                  {color.value !== 'default' ? (
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.value }} />
                  ) : (
                    <div className="w-4 h-4 rounded border bg-gradient-to-r from-gray-300 to-gray-500" />
                  )}
                  {color.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-8 bg-border" />

        {/* Text Formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-8 bg-border" />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} title="Normal Text">
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Large Heading">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Medium Heading">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Small Heading">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-8 bg-border" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-8 bg-border" />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-8 bg-border" />

        {/* Link */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              onClick={openLinkPopover}
              variant={isLinkActive ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-8 w-8 p-0', isLinkActive && 'bg-primary text-primary-foreground')}
              title="Insert Link"
              data-testid="toolbar-insert-link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start" data-testid="link-popover">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{isLinkActive ? 'Edit Link' : 'Insert Link'}</p>
              <div className="flex gap-2">
                <Input
                  ref={linkInputRef}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-8 text-sm"
                  data-testid="link-url-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyLink();
                    }
                    if (e.key === 'Escape') {
                      setLinkPopoverOpen(false);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3"
                  onClick={applyLink}
                  data-testid="link-apply-button"
                >
                  Apply
                </Button>
              </div>
              {isLinkActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-destructive hover:text-destructive"
                  onClick={removeLink}
                  data-testid="link-remove-button"
                >
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  Remove Link
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-8 bg-border" />

        {/* Table */}
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          isActive={editor.isActive('table')}
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-8 bg-border" />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="bg-background dark:bg-background"
        data-testid="editor-content"
      />

      {/* Link hover tooltip */}
      {hoverTooltip && (
        <div
          ref={tooltipRef}
          data-testid="link-hover-tooltip"
          className="fixed z-50 flex items-center gap-1.5 rounded-md border bg-popover text-popover-foreground shadow-md px-2.5 py-1.5 text-sm"
          style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={() => {
            hoverTimeoutRef.current = setTimeout(() => setHoverTooltip(null), 100);
          }}
        >
          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span
            className="max-w-[220px] truncate text-muted-foreground"
            title={hoverTooltip.href}
          >
            {hoverTooltip.href}
          </span>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            type="button"
            title="Open link"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() => {
              window.open(hoverTooltip.href, '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </button>
          <button
            type="button"
            title="Edit link"
            className="flex items-center gap-1 text-xs font-medium hover:underline"
            onClick={() => {
              const { anchor, href } = hoverTooltip;
              setHoverTooltip(null);
              try {
                const pos = editor.view.posAtDOM(anchor.firstChild ?? anchor, 0);
                editor.chain().focus().setTextSelection(pos).extendMarkRange('link').run();
              } catch {
                editor.commands.focus();
              }
              setLinkUrl(href);
              setLinkPopoverOpen(true);
            }}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            type="button"
            title="Remove link"
            className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
            onClick={() => {
              const { anchor } = hoverTooltip;
              setHoverTooltip(null);
              try {
                const pos = editor.view.posAtDOM(anchor.firstChild ?? anchor, 0);
                editor.chain().focus().setTextSelection(pos).extendMarkRange('link').unsetLink().run();
              } catch {
                editor.chain().focus().unsetLink().run();
              }
            }}
          >
            <Unlink className="h-3 w-3" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
