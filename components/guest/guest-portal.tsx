
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  User, 
  Settings, 
  History, 
  CreditCard, 
  MessageCircle,
  LogOut
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface GuestPortalProps {
  user: any;
}

export function GuestPortal({ user }: GuestPortalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'bookings', label: 'My Bookings', icon: Calendar },
    { id: 'history', label: 'Booking History', icon: History },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const mockBookings = [
    {
      id: '1',
      confirmationNumber: 'CONF123456',
      hotelName: 'Serenity Mountain Lodge',
      roomType: 'Deluxe Room',
      checkIn: '2025-01-15',
      checkOut: '2025-01-18',
      status: 'CONFIRMED',
      totalAmount: 660,
    },
    {
      id: '2',
      confirmationNumber: 'CONF789012',
      hotelName: 'Serenity Mountain Lodge',
      roomType: 'Standard Room',
      checkIn: '2024-12-20',
      checkOut: '2024-12-23',
      status: 'CHECKED_OUT',
      totalAmount: 450,
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming Bookings</p>
                      <p className="text-2xl font-bold">1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <History className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Stays</p>
                      <p className="text-2xl font-bold">2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <p className="text-2xl font-bold">{formatCurrency(1110)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="font-medium">Upcoming stay at Serenity Mountain Lodge</p>
                      <p className="text-sm text-gray-500">January 15-18, 2025</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Booking confirmed</p>
                      <p className="text-sm text-gray-500">Confirmation #CONF123456</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'bookings':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Bookings</h2>
              <Button className="bg-teal-600 hover:bg-teal-700">
                New Booking
              </Button>
            </div>
            
            <div className="space-y-4">
              {mockBookings.filter(booking => booking.status === 'CONFIRMED').map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{booking.hotelName}</h3>
                        <p className="text-gray-600 mb-2">{booking.roomType}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Check-in: {formatDate(booking.checkIn)}</span>
                          <span>Check-out: {formatDate(booking.checkOut)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Confirmation: {booking.confirmationNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="mb-2" variant="secondary">
                          {booking.status}
                        </Badge>
                        <p className="text-lg font-bold">{formatCurrency(booking.totalAmount)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Modify
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
        
      case 'history':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Booking History</h2>
            
            <div className="space-y-4">
              {mockBookings.filter(booking => booking.status === 'CHECKED_OUT').map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{booking.hotelName}</h3>
                        <p className="text-gray-600 mb-2">{booking.roomType}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Check-in: {formatDate(booking.checkIn)}</span>
                          <span>Check-out: {formatDate(booking.checkOut)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="mb-2" variant="outline">
                          {booking.status}
                        </Badge>
                        <p className="text-lg font-bold">{formatCurrency(booking.totalAmount)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Receipt
                      </Button>
                      <Button variant="outline" size="sm">
                        Leave Review
                      </Button>
                      <Button variant="outline" size="sm" className="text-teal-600 hover:text-teal-700">
                        Book Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Profile Settings</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                
                <Button className="bg-teal-600 hover:bg-teal-700">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Guest Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
