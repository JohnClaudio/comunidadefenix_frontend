import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import { Platform } from '@/types/platform';

interface PlatformCardProps {
  platform: Platform;
  onConnect: (platform: Platform) => void;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ platform, onConnect }) => {
  return (
    <Card className="bg-card border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      <CardContent className="p-8 flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:scale-110 group-hover:border-primary/30 transition-all duration-300 shadow-lg">
          {platform.logo ? (
            <img 
              src={platform.logo} 
              alt={platform.name} 
              className="w-14 h-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-2xl">
                {platform.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-foreground text-center text-lg">{platform.name}</h3>
        
        <Button 
          size="sm" 
          onClick={() => onConnect(platform)}
          className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 px-6"
        >
          <Link2 size={14} className="mr-1.5" />
          Vincular
        </Button>
      </CardContent>
    </Card>
  );
};

export default PlatformCard;
