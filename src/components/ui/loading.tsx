import Loading from "../loading";
import { cn } from "@/utils"
export interface ISVGProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
}

export const LoadingSpinner = ({
    size = 24,
    className,
    ...props
}: ISVGProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("animate-spin", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
};

export const LoadingOverLay = () => {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <Loading />
    </div>
}
