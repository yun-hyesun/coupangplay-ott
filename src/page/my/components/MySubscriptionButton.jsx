import React from 'react';
export const MySubscriptionButton = ({children,secondary=false,className='',...props}) => (
 <button type="button" className={`my-pass-button ${secondary?'is-secondary':''} ${className}`} {...props}>{children}</button>
);
