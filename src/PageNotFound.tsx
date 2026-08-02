import { Button } from '@/components/ui/button';
import { useNavigate } from "react-router-dom";
// import { notFound } from './assets/images';

export default function PageNotFound() {
  const navigate = useNavigate()
  return (
    <div className="absolute left-1/2 top-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center">
      <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
        404
      </span>
      <h2 className="font-heading my-2 text-2xl font-bold">
        Something miss
      </h2>
      <p>Page not found</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button onClick={() => navigate(-1)} variant="default" size="lg">
          Go back
        </Button>
        <Button
          onClick={() => navigate('/home')}
          variant="ghost"
          size="lg"
        >
          Back home
        </Button>
      </div>
    </div>
  );
}
