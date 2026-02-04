import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  className?: string;
}

export const CTASection: React.FC<CTASectionProps> = ({
  title = 'Ready to Find Your Dream Property?',
  description = 'Join thousands of happy users who found their perfect property with AUS Property Intelligence',
  primaryButtonText = 'Start Searching',
  primaryButtonHref = '/search',
  secondaryButtonText,
  secondaryButtonHref,
  className = '',
}) => {
  return (
    <section className={`py-16 sm:py-20 md:py-24 bg-primary-600 text-white w-full ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight">{title}</h2>
        <p className="text-base sm:text-lg md:text-xl text-primary-100 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
          <Link href={primaryButtonHref} className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto px-6 sm:px-8 shadow-md hover:shadow-lg transition-shadow"
            >
              {primaryButtonText}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          {secondaryButtonText && secondaryButtonHref && (
            <Link href={secondaryButtonHref} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary-600 hover:bg-gray-100 px-6 sm:px-8 shadow-md hover:shadow-lg transition-shadow"
              >
                {secondaryButtonText}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
