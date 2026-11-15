package aftershock;
public final class RefDump {
    static void array(double[] a){System.out.print("[");for(int i=0;i<a.length;i++){if(i>0)System.out.print(",");System.out.print(Double.isFinite(a[i])?Double.toString(a[i]):"null");}System.out.print("]");}
    public static void main(String[] args)throws Exception {
        System.out.print("[");boolean first=true;
        for(String asset:new String[]{"AAPL","MSFT","GARCH"})for(String period:new String[]{"all","crisis","later"}) {
            if(asset.equals("GARCH")&&!period.equals("all"))continue;
            var raw=asset.equals("GARCH")?Statistics.garch(2766,42):Statistics.returns(Dataset.load(asset,period.equals("later")?"2013-01-01":"2007-01-01",period.equals("crisis")?"2009-12-31":"2017-12-31"));
            for(String mode:new String[]{"signed","absolute","squared"}){
                if(!first)System.out.print(",");first=false;
                System.out.printf("{\"asset\":\"%s\",\"period\":\"%s\",\"mode\":\"%s\",\"returns\":",asset,period,mode);array(raw);
                System.out.print(",\"acf\":");array(Statistics.acf(Statistics.transform(raw,mode),60));
                System.out.print(",\"shuffled\":");array(Statistics.acf(Statistics.transform(Statistics.shuffle(raw,991),mode),60));
                System.out.print(",\"rms\":");array(Statistics.rms(raw,20));System.out.print("}");
            }
        }System.out.print("]");
    }
}
