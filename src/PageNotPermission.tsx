import { Button } from '@/components/ui/button';

export default function PageNotPermission() {
  return (
    <div className="absolute left-1/2 top-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center">
      <span className="bg-gradient-to-b from-foreground to-transparent bg-clip-text text-[10rem] font-extrabold leading-none text-transparent">
        401
      </span>
      <h2 className="font-heading my-2 text-2xl font-bold">
        Something miss
      </h2>
      <p>Page not permission</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button
          onClick={() => window.location.replace('/home')}
          variant="ghost"
          size="lg"
        >
          Back home
        </Button>
      </div>
    </div>
  );
}
