(this["webpackJsonptrivia-react"]=this["webpackJsonptrivia-react"]||[]).push([[0],{13:function(e,t,a){e.exports=a(21)},20:function(e,t,a){},21:function(e,t,a){"use strict";a.r(t);var s=a(0),n=a.n(s),c=a(10),i=a.n(c),o=function(){var e=(new Date).getFullYear();return n.a.createElement(n.a.Fragment,null,n.a.createElement("footer",null,"\xa9 ",e," Oscar Villalta"))},r=function(){return n.a.createElement("div",{className:"header"},n.a.createElement("h1",null,"Weird Trivia Fun"))},l=a(7),u=a(4),h=function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};Object(u.a)(this,e),this.question="",this.answers=[],Object.assign(this,t)},m=a(11),d=a(5),f=[{question:"If a person holds 3 widgets, How many tires can fit in a locker?",answers:[{choice:"Banana",status:!0},{choice:"Dirt",status:!1},{choice:"Umbrella",status:!1},{choice:"Square root of a triangle",status:!1}],link:"somelink.com"},{question:"If a plane is going 300mph, does Puppy like gyros?",answers:[{choice:"James Cameron",status:!0},{choice:"Martian",status:!1},{choice:"Guitar",status:!1},{choice:"Javascript",status:!1}],link:"somelink.com"},{question:"10 times 6 is...",answers:[{choice:"Car",status:!0},{choice:"George Washington",status:!1},{choice:"Perpetual Motion",status:!1},{choice:"Tower of Hanoi",status:!1}],link:"somelink.com"},{question:"The seven dwarfs are part of which highway",answers:[{choice:"Hans Christian Anderson",status:!0},{choice:"Hamster",status:!1},{choice:"17 USD",status:!1},{choice:"Aorta",status:!1}],link:"somelink.com"},{question:"Dallas, Massachussets is adjacent to the cellular membrane on which sandwich?",answers:[{choice:"Salacious Crumb",status:!0},{choice:"Pneumonoultramicroscopicsilicovolcanoconiosis",status:!1},{choice:"6 of Diamonds",status:!1},{choice:"Twelveteen",status:!1}],link:"somelink.com"},{question:"Udo has a grain of salt. There are many wolves in a hectare.  Is rose the color of a prodigy?",answers:[{choice:"Truffles",status:!0},{choice:"Axe Body Spray",status:!1},{choice:"C",status:!1},{choice:"Vincent Van Gogh",status:!1}],link:"somelink.com"},{question:"Actor, inanimate carbon rod, stars in which Sci-Fi potato?",answers:[{choice:"Yardstick",status:!0},{choice:"Blue",status:!1},{choice:"February 14th 2008",status:!1},{choice:"Chicago Bulls",status:!1}],link:"somelink.com"},{question:"A crystalline solution of ketchup is also known as...",answers:[{choice:"External Occipital Protubrance",status:!0},{choice:"Edgar Allen Poe",status:!1},{choice:"Horse",status:!1},{choice:"Ceiling Fan",status:!1}],link:"somelink.com"},{question:"Where is the tallest amoeba in a walnut located.",answers:[{choice:"Roast Beef Sandwich",status:!0},{choice:"Labor Pains",status:!1},{choice:"Jaundice",status:!1},{choice:"A-10 Thunderbolt",status:!1}],link:"somelink.com"},{question:"During the War of 485, cosmonauts invented which Tetris Game?",answers:[{choice:"Astral Projection",status:!0},{choice:"Lightning and Thunder",status:!1},{choice:"NORAD",status:!1},{choice:"Isildur",status:!1}],link:"somelink.com"},{question:"Human Centipedes are most commonly used for this type of degenerative tissue behavior.",answers:[{choice:"10,000 Maniacs",status:!0},{choice:"Speed of Sound",status:!1},{choice:"Array of Objects",status:!1},{choice:"a battery",status:!1}],link:"somelink.com"},{question:"Peanut butter and waffled french fries, sometimes, are referred to this type of oil change",answers:[{choice:"The Quickening",status:!0},{choice:"UMDNJ",status:!1},{choice:"United Airlines",status:!1},{choice:"Grover Cleveland",status:!1}],link:"somelink.com"}],k=new(function(){function e(){Object(u.a)(this,e)}return Object(m.a)(e,[{key:"get",value:function(){var e=f.map((function(e){return new h(e)}));return Object(d.shuffle)(e)}}]),e}()),w=a(23),g=function(e){var t=e.answers,a=e.handleClick,s=Object(d.shuffle)(t);return n.a.createElement(n.a.Fragment,null,n.a.createElement(w.a,{onClick:a},s[0].choice),n.a.createElement(w.a,{onClick:a},s[1].choice),n.a.createElement(w.a,{onClick:a},s[2].choice),n.a.createElement(w.a,{onClick:a},s[3].choice))},p=a(22),E=function(e){var t=e.question;return n.a.createElement(n.a.Fragment,null,n.a.createElement(p.a,null,n.a.createElement("h2",null,t)))},v=function(e){var t=e.question,a=e.answers,s=e.handleClick;return n.a.createElement(n.a.Fragment,null,n.a.createElement("div",{className:"question-wrapper"},n.a.createElement(E,{question:t})),n.a.createElement("div",{className:"answer-wrapper"},n.a.createElement(g,{answers:a,handleClick:s})))},b=function(){var e=function(){var e=Object(s.useState)([new h]),t=Object(l.a)(e,2),a=t[0],n=t[1],c=Object(s.useState)(!1),i=Object(l.a)(c,2),o=i[0],r=i[1],u=Object(s.useState)(0),m=Object(l.a)(u,2),d=m[0],f=m[1];return{gameIsOn:o,questionNumber:d,startGame:function(){n(k.get()),f(0),r(!0)},handleClick:function(){d>=a.length-1?r(!1):f(d+1)},questions:a}}(),t=e.questionNumber,a=e.handleClick,c=e.gameIsOn,i=e.startGame,o=e.questions[t];return c?n.a.createElement(n.a.Fragment,null,n.a.createElement(v,{question:o.question,answers:o.answers,handleClick:a})):n.a.createElement("div",{className:"start-menu"},n.a.createElement(w.a,{onClick:i},"Start Game"))},q=function(){return n.a.createElement("div",{className:"app"},n.a.createElement(r,null),n.a.createElement("div",{className:"main"},n.a.createElement(b,null)),n.a.createElement(o,null))};a(20);i.a.render(n.a.createElement(n.a.StrictMode,null,n.a.createElement(q,null)),document.getElementById("root"))}},[[13,1,2]]]);
//# sourceMappingURL=main.dd209183.chunk.js.map