'use client';

import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Bed, Bath, Calendar } from 'lucide-react';

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  listDate: string;
  image: string;
  type: 'house' | 'apartment' | 'unit' | 'land';
  suburb: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onViewDetails }) => {
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU');
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
         onClick={() => onViewDetails(property)}>
      {/* Image Container */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {!imageError ? (
          <img
            src={property.image}
            alt={property.address}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
            <MapPin size={48} />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-2xl font-bold text-gray-900">{formatPrice(property.price)}</p>
          <DollarSign className="text-green-600" size={24} />
        </div>

        {/* Address */}
        <p className="text-gray-700 font-semibold mb-1 truncate">{property.address}</p>
        <p className="text-gray-500 text-sm mb-3">
          {property.suburb}, {property.postcode}
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center text-gray-600">
            <Bed size={18} className="mr-1" />
            <span className="text-sm">{property.bedrooms} bed</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Bath size={18} className="mr-1" />
            <span className="text-sm">{property.bathrooms} bath</span>
          </div>
          <div className="flex items-center text-gray-600">
            <span className="text-sm">{property.sqft.toLocaleString()} sqft</span>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center text-gray-500 text-xs">
          <Calendar size={14} className="mr-1" />
          <span>Listed {formatDate(property.listDate)}</span>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 hidden" />
    </div>
  );
};

interface PropertyGridProps {
  properties: Property[];
  loading?: boolean;
  onViewDetails: (property: Property) => void;
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties,
  loading = false,
  onViewDetails,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Search size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-600 text-lg">No properties found</p>
        <p className="text-gray-500 text-sm">Try adjusting your search filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} onViewDetails={onViewDetails} />
      ))}
    </div>
  );
};

export default PropertyGrid;
