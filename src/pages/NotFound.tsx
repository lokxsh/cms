import { Link } from "react-router-dom";
import { Compass } from "@phosphor-icons/react";
import { Button, EmptyState } from "../components/ui";

export function NotFound() {
  return <EmptyState icon={Compass} title="Page not found" body="This admin page doesn't exist. Check the address or use search (Ctrl K)." action={<Link to="/"><Button>Go to dashboard</Button></Link>} />;
}
