import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)


  const [name, setName ] = useState("")
  const [description,setDescription ] = useState("")
  const [image, setImage ] = useState(null)
  const [url, setUrl ] = useState(null)

  const [message, setMessage] = useState("")
  const [isWaiting, setIsWaiting] = useState(false)

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()

    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)
    setNFT(nft)
    const name=await nft.name()
    console.log(name)
  }

  const submitHandler = async (e) => {
    e.preventDefault()
    if (name === "" || description === "") {
      window.alert("Please provide a name and description")
      return
    }
    setIsWaiting(true)
    const imageData=createImage()
    const url= await uploadImage(imageData)
    await mintImage(url)
    setIsWaiting(false)
    setMessage("")
  }

  const createImage = async () => {
    setMessage("Generating Image...")

    // Send the request
    const response = await axios({
      url: 'https://api.openai.com/v1/images/generations',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_DALLE_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        prompt: description,
        n: 2,
        size: '512x512'
      }),
      response_format: 'url',
    });

    const data = response.data;
    const img = data.data[0].url
    setImage(img);
    console.log("Generating Finished...")
    return data;  

  }

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...")

    // Create instance to NFT.Storage
    const nftstorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY })

    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

    // Save the URL
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`
    setUrl(url)

    return url
  }

  const mintImage = async (tokenURI) => {
    setMessage("Minting...")
    const signer=await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI,{value: ethers.utils.parseUnits("1","ether")})
    await transaction.wait()
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <div className='form'>
        <form onSubmit={submitHandler}>
          <input type="text" placeholder="Create a Name" onChange={(e) => { setName(e.target.value) }}></input>
          <input type="text" placeholder="Create a Description" onChange={(e) => { setDescription(e.target.value) }}></input>
          <input type="submit" value="Create and Mint"></input>
        </form>
        <div className="image">
          {!isWaiting && image ? (
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
      {!isWaiting && url && (
        <p>
          View&nbsp;<a href={url} target="_blank" rel="noreferrer">Metadata</a>
        </p>
      )}
    </div>
  );
}

export default App;
