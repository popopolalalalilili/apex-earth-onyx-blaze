import { createFileRoute } from "@tanstack/react-router";
import { WickApp } from "@/components/wick/App";

export const Route = createFileRoute("/")({
  component: WickApp,
});
