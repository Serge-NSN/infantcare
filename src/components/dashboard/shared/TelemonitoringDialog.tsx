// src/components/dashboard/shared/TelemonitoringDialog.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { getDatabase, ref, onValue, off, type Database } from 'firebase/database';
import { db as firestoreDb, app } from '@/lib/firebase'; // Use the main app instance
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Thermometer, Droplets, HeartPulse, Wind, Activity, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Vitals {
  airTemp: string;
  bodyTemp: string;
  heartRate: string;
  humidity: string;
  spo2: string;
}

interface HistoricalDataPoint extends Vitals {
  time: string;
}

interface TelemonitoringDialogProps {
  patientName: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const VitalCard = ({ icon, title, value, unit, isLoading }: { icon: React.ReactNode, title: string, value: string, unit: string, isLoading: boolean }) => (
  <Card className="text-center shadow-lg">
    <CardHeader className="pb-2">
      <div className="flex justify-center text-primary">{icon}</div>
      <CardTitle className="text-lg font-headline">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : <p className="text-3xl font-bold">{value} <span className="text-xl text-muted-foreground">{unit}</span></p>}
    </CardContent>
  </Card>
);

export function TelemonitoringDialog({ patientName, isOpen, onOpenChange }: TelemonitoringDialogProps) {
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    
    // Get the Realtime Database instance from the main Firebase app connection
    const db: Database = getDatabase(app); 
    const healthRef = ref(db, 'Health');

    const listener = onValue(healthRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val() as Vitals;
        setVitals(data);
        setError(null);
        
        setHistoricalData(prevData => {
          const newDataPoint = {
            ...data,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          const updatedData = [...prevData, newDataPoint];
          return updatedData.slice(-20); 
        });

      } else {
        setError("No live data found at the 'Health' path.");
        setVitals(null);
      }
    }, (error) => {
      console.error("Firebase Realtime Database error:", error);
      setError("Failed to connect to the telemonitoring service.");
      setIsLoading(false);
    });

    return () => {
      off(healthRef, 'value', listener);
    };
  }, [isOpen]);

  const chartData = useMemo(() => historicalData.map(d => ({
    time: d.time,
    BodyTemp: parseFloat(d.bodyTemp),
    HeartRate: parseInt(d.heartRate, 10),
    SPO2: parseInt(d.spo2, 10),
  })), [historicalData]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Live Telemonitoring for {patientName}</DialogTitle>
          <DialogDescription>
            Displaying live vitals from the remote monitoring device. Data updates in real-time.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-center text-destructive py-4">{error}</p>}
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <VitalCard icon={<Thermometer size={32}/>} title="Body Temp" value={vitals?.bodyTemp ?? '--'} unit="°C" isLoading={isLoading} />
            <VitalCard icon={<HeartPulse size={32}/>} title="Heart Rate" value={vitals?.heartRate ?? '--'} unit="bpm" isLoading={isLoading} />
            <VitalCard icon={<Activity size={32}/>} title="SPO2" value={vitals?.spo2 ?? '--'} unit="%" isLoading={isLoading} />
            <VitalCard icon={<Droplets size={32}/>} title="Humidity" value={vitals?.humidity ?? '--'} unit="%" isLoading={isLoading} />
            <VitalCard icon={<Wind size={32}/>} title="Air Temp" value={vitals?.airTemp ?? '--'} unit="°C" isLoading={isLoading} />
        </div>

        <div className="my-4 text-center">
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link href="http://198.163.43.208" target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-5 w-5"/>
                    Tele-encounter
                </Link>
            </Button>
        </div>


        <div className="flex-grow min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="BodyTemp" stroke="#8884d8" yAxisId={0} name="Body Temp (°C)" />
                    <Line type="monotone" dataKey="HeartRate" stroke="#82ca9d" yAxisId={0} name="Heart Rate (bpm)"/>
                    <Line type="monotone" dataKey="SPO2" stroke="#ffc658" yAxisId={0} name="SPO2 (%)"/>
                </LineChart>
            </ResponsiveContainer>
        </div>

      </DialogContent>
    </Dialog>
  );
}
