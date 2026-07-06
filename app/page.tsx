import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import Image from "next/image";

export default function Home() {
  return (
    <div className ="flex flex-col items-center gap-2 justify-center h-screen">
      <Button >
        Get Started
      </Button>
    </div>
  );
}
