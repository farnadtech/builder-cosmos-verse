import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-20">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto text-center">
          <CardHeader className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zemano-500 to-zemano-600 flex items-center justify-center mx-auto">
              <Construction className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold mb-2">{title}</CardTitle>
              <CardDescription className="text-lg">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              این صفحه در حال توسعه است. به زودی در دسترس خواهد بود.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700">
                <Link to="/">
                  بازگشت به صفحه اصلی
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">
                  تماس با پشتیبانی
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
