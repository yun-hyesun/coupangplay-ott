
import React from 'react';

export const SubscriptionMenu = ({
    subscriptionName,
    onPaymentHistory,
    onCancel
}) => {
    return (
        <div className="subscription-dropdown">
            <button type="button" onClick={onPaymentHistory}>
                결제 내역
            </button>

            <button type="button" onClick={onCancel}>
                {subscriptionName} 해지
            </button>
        </div>
    );
};
