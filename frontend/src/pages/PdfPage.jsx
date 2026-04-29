import PdfEditor from '../components/PdfEditor';

export default function PdfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-apple-gray-900">PDF 编辑</h1>
        <p className="mt-1 text-sm text-apple-gray-500">
          批量处理 PDF 标签，添加 SKU 信息
        </p>
      </div>

      <PdfEditor />
    </div>
  );
}
