import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowEditor } from "@/components/workspace/workflow/WorkflowEditor";

export default function Workflow() {
  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <WorkflowEditor />
      </div>
    </ReactFlowProvider>
  );
}
