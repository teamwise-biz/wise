import React from 'react';

export interface StepInfo {
    id: number;
    label: string;
}

interface StepperProps {
    steps: StepInfo[];
    currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    return (
        <div className="stepper">
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                    <React.Fragment key={step.id}>
                        <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            <div className="step-number">{isCompleted ? '✓' : step.id}</div>
                            <div className="step-label" style={{ color: isActive ? '#fff' : (isCompleted ? '#cbd5e1' : '#64748b') }}>
                                {step.label}
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="step-connector">
                                <div
                                    className="step-connector-fill"
                                    style={{ width: isCompleted ? '100%' : '0%' }}
                                ></div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
