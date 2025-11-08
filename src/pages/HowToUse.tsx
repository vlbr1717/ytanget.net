import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const HowToUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-6 py-8">
        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">How to Use Tangent</h1>
            <p className="text-lg text-muted-foreground">
              Learn how to create and manage tangents in your conversations
            </p>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Creating a Tangent</h2>
              <p className="text-foreground/90">
                Tangent allows you to branch off into side conversations without losing track of your main discussion. Here's how:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>
                  <strong>Highlight text</strong> - Select any portion of text in the assistant's response that you want to explore further
                </li>
                <li>
                  <strong>Create tangent</strong> - A popup will appear allowing you to ask a follow-up question about the highlighted text
                </li>
                <li>
                  <strong>Continue the conversation</strong> - Your tangent becomes a separate thread that maintains context from the original message
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Managing Tangents</h2>
              <p className="text-foreground/90">
                Keep your conversations organized with these features:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Collapse tangents</strong> - Click the close button on any tangent to collapse it and reduce clutter
                </li>
                <li>
                  <strong>Nested tangents</strong> - You can create tangents within tangents for deeper exploration
                </li>
                <li>
                  <strong>Independent threads</strong> - Each tangent maintains its own conversation history while preserving the original context
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Benefits</h2>
              <p className="text-foreground/90">
                Tangent helps you:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Explore side topics without derailing your main conversation</li>
                <li>Reduce scrolling by collapsing tangents you're done with</li>
                <li>Maintain clear context for each discussion thread</li>
                <li>Keep complex conversations organized and manageable</li>
              </ul>
            </section>

            <section className="bg-primary/10 border border-primary/20 rounded-lg p-6 space-y-3">
              <h3 className="text-xl font-semibold text-primary">Pro Tip</h3>
              <p className="text-foreground/90">
                When you're finished exploring a tangent, simply close it to keep your view clean. You can always scroll back to see collapsed tangents if you need to reference them later!
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;
