(this["webpackJsonptrivia-react"]=this["webpackJsonptrivia-react"]||[]).push([[0],{26:function(e,t,n){e.exports=n(55)},54:function(e,t,n){},55:function(e,t,n){"use strict";n.r(t);var a=n(0),r=n.n(a),c=n(22),s=n.n(c),u=function(){var e=(new Date).getFullYear();return r.a.createElement(r.a.Fragment,null,r.a.createElement("footer",null,"\xa9 ",e," Oscar Villalta"))},i=function(e){var t=e.title;return r.a.createElement("div",{className:"header"},r.a.createElement("h1",null,t))},l=n(57),o=function(e){var t=e.answers,n=e.handleClick;return r.a.createElement(r.a.Fragment,null,t.map((function(e){return r.a.createElement(l.a,{key:e,onClick:function(e){return n(e)}},e)})))},m=n(56),f=function(e){var t=e.question;return r.a.createElement(r.a.Fragment,null,r.a.createElement(m.a,null,r.a.createElement("h2",null,t)))},p=n(3),h=n.n(p),v=n(5),E=n(9),d=n(7),w=n(6),b=function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};Object(w.a)(this,e),this.question="",this.answers=[],this.correctAnswer="",Object.assign(this,t)},g=n(11),O=n(24),j=n(25),k=n.n(j),C=new(function(){function e(){Object(w.a)(this,e),this.httpClient=void 0,this.httpClient=k.a.create({baseURL:"https://opentdb.com"})}return Object(g.a)(e,[{key:"get",value:function(){var e=Object(v.a)(h.a.mark((function e(t){return h.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",this.httpClient.get(t));case 1:case"end":return e.stop()}}),e,this)})));return function(t){return e.apply(this,arguments)}}()}]),e}()),q=new(function(){function e(){Object(w.a)(this,e)}return Object(g.a)(e,[{key:"get",value:function(){var e=Object(v.a)(h.a.mark((function e(){var t,n,a;return h.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,C.get("/api.php?amount=10");case 2:return t=e.sent,n=t.data.results,a=N(n),e.abrupt("return",Object(d.shuffle)(a));case 6:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}()}]),e}()),N=function(e){var t=O.AllHtmlEntities.decode;return e.map((function(e){var n=Object(d.concat)(e.incorrect_answers,e.correct_answer).map((function(e){return t(e)})),a=Object(d.shuffle)(n)||[];return new b({question:t(e.question),correctAnswer:t(e.correct_answer),answers:a})}))},x=function(){var e=function(){var e=Object(a.useState)([new b]),t=Object(E.a)(e,2),n=t[0],r=t[1],c=Object(a.useState)(!1),s=Object(E.a)(c,2),u=s[0],i=s[1],l=Object(a.useState)(0),o=Object(E.a)(l,2),m=o[0],f=o[1],p=Object(a.useState)(""),w=Object(E.a)(p,2),g=w[0],O=w[1],j=n[m],k=j.answers,C=j.correctAnswer,N=Object(d.find)(k,(function(e){return e===C}));Object(a.useEffect)((function(){m!==n.length-1||i(!1)}),[m,n]);return{gameIsOn:u,currentQuestionId:m,startGame:function(){var e=Object(v.a)(h.a.mark((function e(){var t;return h.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,q.get();case 2:t=e.sent,r(t),f(0),i(!0);case 6:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}(),handleClick:function(e){if(e.currentTarget.textContent===N)return f(m+1),void O("");O("that is incorrect")},questions:n,message:g}}(),t=e.currentQuestionId,n=e.handleClick,c=e.gameIsOn,s=e.startGame,u=e.questions,i=e.message,m=u[t];return c?r.a.createElement("div",{className:"game"},r.a.createElement("div",{className:"question-wrapper"},r.a.createElement(f,{question:m.question})),r.a.createElement("div",{className:"message-wrapper"},r.a.createElement(y,{message:i})),r.a.createElement("div",{className:"answer-wrapper"},r.a.createElement(o,{answers:m.answers,handleClick:n}))):r.a.createElement("div",{className:"game start-page"},r.a.createElement(l.a,{onClick:s},"Start Game"))},y=function(e){var t=e.message;return r.a.createElement(r.a.Fragment,null,r.a.createElement("h3",null,t))},S=function(){return r.a.createElement(x,null)},F=function(){return r.a.createElement("div",{className:"app"},r.a.createElement(i,{title:"Trivia"}),r.a.createElement("div",{className:"main"},r.a.createElement(S,null)),r.a.createElement(u,null))};n(54);s.a.render(r.a.createElement(r.a.StrictMode,null,r.a.createElement(F,null)),document.getElementById("root"))}},[[26,1,2]]]);
//# sourceMappingURL=main.bc85f5be.chunk.js.map