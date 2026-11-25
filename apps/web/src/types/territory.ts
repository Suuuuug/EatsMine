// 영토 1위 계약 타입. 닉네임만 담는다(이메일·실명 금지).

export interface TerritoryContender {
  ownerId: string;
  nickname: string;
  reviewCount: number;
}

export interface TerritoryOwner extends TerritoryContender {
  /** 시도(2자리) 또는 시군구(5자리) 코드. region-codes.json 기준 */
  regionCode: string;
  /** 내가 1위인지 */
  isMe: boolean;
  /** 2·3위(많은 순). 없으면 생략 */
  top?: TerritoryContender[];
}
