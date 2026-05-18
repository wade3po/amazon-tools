import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';

// SEO metadata per route
const seoData = {
  '/tools': {
    titleKey: 'home.title',
    descKey: 'home.subtitle',
    titleEn: 'Free Amazon Seller Tools - SEO, FBA & Listing Optimization',
    titleZh: '免费亚马逊卖家工具 - SEO、FBA、Listing优化',
  },
  '/tools/search-terms': {
    titleKey: 'searchTerms.title',
    descKey: 'searchTerms.desc',
    titleEn: 'Amazon Search Terms Cleaner - Remove Duplicates & Optimize Keywords',
    titleZh: '亚马逊搜索词清洗工具 - 去重优化关键词',
  },
  '/tools/title-optimizer': {
    titleKey: 'titleOptimizer.title',
    descKey: 'titleOptimizer.desc',
    titleEn: 'Amazon Title Optimizer - SEO Score & Keyword Analysis',
    titleZh: '亚马逊标题优化工具 - SEO评分与关键词分析',
  },
  '/tools/flat-file-cleaner': {
    titleKey: 'flatFile.title',
    descKey: 'flatFile.desc',
    titleEn: 'Amazon Flat File Cleaner - Remove Hidden Characters & Fix Encoding',
    titleZh: 'Amazon Flat File清洗工具 - 清除隐藏字符修复编码',
  },
  '/tools/listing-formatter': {
    titleKey: 'listingFormatter.title',
    descKey: 'listingFormatter.desc',
    titleEn: 'Amazon Listing Formatter - Auto-Format Bullets & Quality Score',
    titleZh: '亚马逊Listing格式化 - 自动格式化五点描述与质量评分',
  },
  '/tools/box-label-resizer': {
    titleKey: 'boxLabel.title',
    descKey: 'boxLabel.desc',
    titleEn: 'Amazon Box Label Resizer - Convert A4 PDF to 4x6 Thermal Labels',
    titleZh: '亚马逊箱标尺寸转换 - A4 PDF转4×6热敏标签',
  },
  '/tools/fnsku-splitter': {
    titleKey: 'fnskuSplitter.title',
    descKey: 'fnskuSplitter.desc',
    titleEn: 'FNSKU Label Splitter - Split A4 Multi-Label PDF Sheets',
    titleZh: 'FNSKU标签拆分工具 - A4多格标签PDF拆分',
  },
  '/tools/barcode-generator': {
    titleKey: 'barcode.title',
    descKey: 'barcode.desc',
    titleEn: 'FNSKU Barcode Generator - Batch Generate Code128 Barcodes',
    titleZh: 'FNSKU条码生成器 - 批量生成Code128条码',
  },
  '/tools/image-compliance': {
    titleKey: 'imageCompliance.title',
    descKey: 'imageCompliance.desc',
    titleEn: 'Amazon Image Compliance Tool - Auto 1:1 Square Conversion',
    titleZh: '亚马逊图片合规工具 - 自动1:1正方形转换',
  },
  '/tools/address-formatter': {
    titleKey: 'addressFormatter.title',
    descKey: 'addressFormatter.desc',
    titleEn: 'Amazon MCF Address Formatter - Parse Multi-Platform Addresses',
    titleZh: 'Amazon MCF地址格式化 - 多平台地址解析',
  },
  '/tools/invoice-cleaner': {
    titleKey: 'invoiceCleaner.title',
    descKey: 'invoiceCleaner.desc',
    titleEn: 'Amazon Invoice Cleaner - Extract PDF Invoice Data to Excel',
    titleZh: '亚马逊发票数据提取 - PDF发票转Excel',
  },
};

export default function SeoHead() {
  const location = useLocation();
  const { lang, t } = useI18n();

  useEffect(() => {
    const data = seoData[location.pathname];
    if (!data) return;

    // Set document title
    const title = lang === 'zh' ? data.titleZh : data.titleEn;
    document.title = title;

    // Set meta description
    const desc = t(data.descKey);
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', desc);
    }

    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://amazontools.app${location.pathname}`);

    // Set OG tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    // Set lang attribute
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');

  }, [location.pathname, lang, t]);

  return null;
}
