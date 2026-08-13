import { useMemo } from 'react'
import { useMediaQuery } from 'react-responsive'
export function useTextSizeClass() {
    const isMobile = useMediaQuery({ maxWidth: 767 });
    const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });

    return useMemo(() => {
        if (isMobile) return 'text-sm';
        if (isTablet) return 'text-base';
        return 'text-lg';
    }, [isMobile, isTablet]);
}
