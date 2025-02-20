import DecryptedText from './components/DecryptedText/DecryptedText'

function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen">
      <DecryptedText className="text-4xl font-bold" encryptedClassName='text-4xl font-bold' text="Build better software with Albert." />
      <DecryptedText
        className="text-4xl font-bold"
        encryptedClassName='text-4xl font-bold'
        text="Albert is a software developer with nearly half a decade of experience building customer-facing production applications"
      />
    </div>
  )
}

export default App
