import BigNumber from "bignumber.js";

function formatValue(value:number|string,decimalsLength = 8){
	return BigNumber(value).toFixed(8).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export {
	formatValue
}