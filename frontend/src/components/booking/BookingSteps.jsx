import React from 'react';

const BookingSteps = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Chọn chuyến' },
    { num: 2, label: 'Chọn chỗ' },
    { num: 3, label: 'Thông tin hành khách' },
    { num: 4, label: 'Thanh toán' },
  ];

  return (
    <div className="booking-steps-container">
      <div className="booking-steps">
        {steps.map((step) => {
          let statusClass = '';
          if (step.num < currentStep) statusClass = 'completed';
          else if (step.num === currentStep) statusClass = 'active';
          
          return (
            <div key={step.num} className={`step ${statusClass}`}>
              <div className="step-circle">
                {step.num < currentStep ? <i className="bi bi-check-lg"></i> : step.num}
              </div>
              <div className="step-label">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingSteps;
