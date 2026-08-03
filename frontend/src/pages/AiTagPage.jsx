import { useState, useCallback } from 'react';
import {
  FolderOpenIcon,
  DocumentPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const KEYWORD = 'contains-synthetic-performer';

const STATUS = {
  PENDING: 'pending',   // 待检测
  UNTAGGED: 'untagged', // 未标记
  TAGGED: 'tagged',     // 已标记
  SUCCESS: 'success',   // 写入成功
  ERROR: 'error',       // 失败
};

const statusMeta = {
  [STATUS.PENDING]:  { label: '待检测', color: 'text-apple-gray-400',  dot: 'bg-gray-300'  },
  [STATUS.UNTAGGED]: { label: '未标记', color: 'text-orange-500',      dot: 'bg-orange-400' },
  [STATUS.TAGGED]:   { label: '已标记', color: 'text-green-600',       dot: 'bg-green-400' },
  [STATUS.SUCCESS]:  { label: '写入成功', color: 'text-green-600',     dot: 'bg-green-500' },
  [STATUS.ERROR]:    { label: '失败',   color: 'text-red-500',         dot: 'bg-red-400'   },
};

function getFileName(p) {
  return p.replace(/\\/g, '/').split('/').pop();
}
