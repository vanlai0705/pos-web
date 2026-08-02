import React, { MouseEventHandler } from 'react';

interface PlayButtonProps {
    title: string;
    onPress: MouseEventHandler<HTMLButtonElement>;
}

const PlayButton: React.FC<PlayButtonProps> = ({ title = "default", onPress }) => {
    return (
        <div className="flex justify-center">
            <div className="relative inline-flex group">
                <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-full blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>

                <button
                    onClick={onPress}
                    className="relative inline-flex items-center justify-center w-[90px] h-[28px] md:w-[140px] md:h-[36px] md:text-[18px] text-[12px] py-2 text-lg font-bold text-white transition-all duration-200 bg-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                    type="button"
                    title="Get quote now"
                >
                    {title}
                </button>
            </div>
        </div>
    );
};

export default PlayButton;
