import  jwt  from 'jsonwebtoken';


export const generateAuthToken = (email: string) => {
    const access = "auth";
    const token = jwt
    .sign({id: email}, 'wooasasdzxc')
    .toString();

    // console.log(token);
    return token;
  }

export default generateAuthToken;