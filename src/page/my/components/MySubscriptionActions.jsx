// 정기결제 해지·해지 철회는 서버에서 처리합니다. 클라이언트에서 구독 문서를 삭제하지 않습니다.
export async function MySubscriptionActions({id,action,user}) {
 const token=await user.getIdToken();
 const response=await fetch(`/api/subscriptions/${encodeURIComponent(id)}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({})});
 if(!response.ok||!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.');
 const result=await response.json();
 if(!result.success)throw new Error(result.message||'요청을 처리하지 못했습니다.');
 return result;
}
