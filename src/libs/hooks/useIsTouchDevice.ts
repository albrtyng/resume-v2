import { useEffect, useState } from 'react';

export const useIsTouchDevice = () => {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsTouch(window.matchMedia('(hover: none)').matches);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isTouch;
};
