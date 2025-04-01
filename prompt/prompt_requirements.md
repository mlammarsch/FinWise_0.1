Bei Klick auf das Dropdown mit der Funktion "mode=fill" soll die mitgegebene CategoryId im CategoryTransferModal wie folgt verarbeitet werden.
Der Id Wert muss an die SelectCategory übergeben werden, die für das Feld "fromCategoryId" steht. 
Bei Klick auf das Dropdown mit der Funktion "mode=transfer" soll die mitgegebene CategoryId im CategoryTransferModal wie folgt verarbeitet werden.
Der Id Wert muss an die SelectCategory übergeben werden, die für das Feld "toCategoryId" steht. 
Baue Logs ein an den Stellen, wo die CategoryId übergeben wird bis hin zur Select Komponente. Wir bekommen es einfach nicht gebacken, dass je nach mode-Fall entweder das Select from oder to entsprechend vorbefüllt wird mit der betreffenden Kategorie.
Die Id muss in der Selectkomponente logischerweise den Namen der Kategorie auflösen, der im Suchfeld dann auch als eingetragener Wert erscheinen muss.
Baue so viele Logs ein wie möglich, damit wir den Verlauf der Prop und Model Übergabe super genau nachvollziehen und analysieren können, wenn es nicht klappt.