import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";

const Generator = () => {
  const [context, setContext] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context.trim()) {
      toast({
        title: "Error",
        description: "Please enter some context about your newsletter",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: { context }
      });

      if (error) {
        // Check if it's a quota exceeded error
        if (error.message?.includes('quota exceeded')) {
          toast({
            title: "OpenAI API Limit Reached",
            description: "The OpenAI API quota has been exceeded. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      
      setTitles(data.titles);
      toast({
        title: "Success",
        description: "Generated 20 newsletter titles for you!",
      });
    } catch (error) {
      console.error('Error generating titles:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate titles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (title: string) => {
    navigator.clipboard.writeText(title);
    toast({
      title: "Copied!",
      description: "Title copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mt-16">
            <h1 className="text-4xl font-bold text-primary">Newsletter Title Generator</h1>
            <p className="mt-2 text-gray-600">
              Describe your newsletter and get 20 creative title suggestions
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Enter details about your newsletter (e.g., topic, target audience, style, tone)"
              className="min-h-[120px]"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating titles...
                </>
              ) : (
                "Generate Titles"
              )}
            </Button>
          </form>

          {titles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Titles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {titles.map((title, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-secondary/50 transition-colors"
                    >
                      <span className="flex-1">{title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(title)}
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Generator;