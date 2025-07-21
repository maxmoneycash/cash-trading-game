import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

const TestChart: React.FC = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);

    useEffect(() => {
        console.log('TestChart useEffect running');
        
        if (!chartRef.current) {
            console.error('Chart ref not available');
            return;
        }

        // Prevent double initialization in StrictMode
        if (p5InstanceRef.current) {
            console.log('p5 instance already exists, skipping');
            return;
        }

        const sketch = (p: p5) => {
            console.log('p5 sketch function called');
            
            p.setup = () => {
                console.log('p5 setup called');
                p.createCanvas(400, 300);
                p.background(255, 0, 0); // Red background
            };

            p.draw = () => {
                p.background(255, 0, 0);
                p.fill(255);
                p.textSize(32);
                p.text('TEST CHART', 50, 150);
            };
        };

        console.log('Creating p5 instance...');
        p5InstanceRef.current = new p5(sketch, chartRef.current);
        console.log('p5 instance created:', p5InstanceRef.current);

        return () => {
            console.log('Cleaning up p5 instance');
            if (p5InstanceRef.current) {
                p5InstanceRef.current.remove();
                p5InstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
            <div style={{ color: 'white', padding: '20px' }}>
                Test Chart Component Loaded
            </div>
            <div 
                ref={chartRef} 
                style={{ 
                    width: '400px', 
                    height: '300px', 
                    border: '2px solid white',
                    margin: '20px'
                }}
            ></div>
        </div>
    );
};

export default TestChart;