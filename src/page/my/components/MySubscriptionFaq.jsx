import React from 'react';
import {MyFaqs} from '../MySubscriptionData';
export const MySubscriptionFaq=()=> <section className="my-pass-faq"><h2>자주 묻는 질문</h2>{MyFaqs.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true"/></summary><p>{a}</p></details>)}</section>;
