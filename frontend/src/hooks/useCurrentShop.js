import { useState, useEffect } from 'react';

/**
 * 读取当前选中的店铺
 * Header 组件切换店铺时会把完整 shop 对象存到 localStorage
 */
export function useCurrentShop() {
  const getShop = () => {
    try {
      const raw = localStorage.getItem('currentShop');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [currentShop, setCurrentShop] = useState(getShop);

  useEffect(() => {
    const handler = () => setCurrentShop(getShop());
    window.addEventListener('shopChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('shopChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return { currentShop };
}
