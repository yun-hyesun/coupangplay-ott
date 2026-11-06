// 운영 결제 어댑터. PG가 검증한 주문 결과만 반환해야 합니다.
// 프런트엔드에서 Firestore에 구독 권한을 생성하거나 카드번호를 저장하지 않습니다.
export async function MySubscriptionPayment({planId,signal,idToken}) {
 const response=await fetch('/api/subscriptions/checkout',{method:'POST',credentials:'same-origin',signal,
 headers:{'Content-Type':'application/json','Authorization':`Bearer ${idToken}`},body:JSON.stringify({planId})});
 const type=response.headers.get('content-type')||'';
 if(!response.ok||!type.includes('application/json'))throw new Error('결제 서비스가 아직 연결되지 않았습니다. 결제가 진행되지 않았습니다.');
 const result=await response.json();
 if(result.status!=='paid'||!result.orderId)throw new Error(result.message||'결제 완료를 확인하지 못했습니다. 구독내역을 확인해 주세요.');
 return result;
}
